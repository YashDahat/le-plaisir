package com.webappfoundation.plaisir;

import com.webappfoundation.dto.BulkUploadResult;
import com.webappfoundation.dto.LoyaltyEventRuleDto;
import com.webappfoundation.dto.OrderDto;
import com.webappfoundation.exception.ResourceNotFoundException;
import com.webappfoundation.model.LoyaltyEventType;
import com.webappfoundation.model.User;
import com.webappfoundation.plaisir.PlaisirModel.*;
import com.webappfoundation.repository.UserRepository;
import com.webappfoundation.service.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

import static com.webappfoundation.plaisir.PlaisirService.*;

/** Ways to earn, welcome, Get started checklist and suggestions. Rewards only via the foundation loyalty engine. */
@Service
public class PlaisirEngagementService {
    private static final Map<LoyaltyEventType, String> LABELS = Map.of(
            LoyaltyEventType.REVIEW, "Review a dish",
            LoyaltyEventType.REVIEW_MEDIA, "Add a photo to your review",
            LoyaltyEventType.FEEDBACK, "Share feedback on an order",
            LoyaltyEventType.SUGGESTION, "Suggest an idea",
            LoyaltyEventType.REFERRAL_SIGNUP, "A friend joins through you",
            LoyaltyEventType.REFERRAL_PURCHASE, "A friend's first order",
            LoyaltyEventType.PROFILE_COMPLETE, "Complete your profile",
            LoyaltyEventType.SIGNUP, "Join Le Plaisir");

    private final LoyaltyConfigService loyaltyConfig;
    private final LoyaltyEventService loyaltyEvents;
    private final CoinService coins;
    private final OrderService orders;
    private final UserRepository users;
    private final BookingRepo bookings;
    private final GatheringRepo gatherings;
    private final FavouriteRepo favourites;
    private final SuggestionRepo suggestions;
    private final AuditService audit;
    private final SpreadsheetParser parser;

    public PlaisirEngagementService(LoyaltyConfigService loyaltyConfig, LoyaltyEventService loyaltyEvents, CoinService coins,
                                    OrderService orders, UserRepository users, BookingRepo bookings, GatheringRepo gatherings,
                                    FavouriteRepo favourites, SuggestionRepo suggestions, AuditService audit, SpreadsheetParser parser) {
        this.loyaltyConfig = loyaltyConfig; this.loyaltyEvents = loyaltyEvents; this.coins = coins; this.orders = orders;
        this.users = users; this.bookings = bookings; this.gatherings = gatherings; this.favourites = favourites;
        this.suggestions = suggestions; this.audit = audit; this.parser = parser;
    }

    public List<Map<String, Object>> waysToEarn() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (LoyaltyEventRuleDto r : loyaltyConfig.listEventRules()) {
            if (!r.isEarnsCoins() || !LABELS.containsKey(r.getEventType())) continue;
            out.add(m("type", r.getEventType(), "label", LABELS.get(r.getEventType()), "points", r.getPoints(),
                    "perDayCap", r.getPerDayCap(), "onceOnly", r.isOnceOnly()));
        }
        return out;
    }

    public Map<String, Object> welcome(Integer userId) {
        auth(userId);
        User u = users.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        BigDecimal balance = coins.spendable(userId);
        List<OrderDto> mine = orders.myOrders(userId);
        Map<String, Object> next = null;
        LocalDate today = LocalDate.now(PlaisirService.IST);
        for (BookingDetail b : bookings.findByUserIdOrderByDateDesc(userId)) {
            if (b.getDate().isBefore(today)) continue;
            OrderDto o = mine.stream().filter(x -> x.getId().equals(b.getOrderId())).findFirst().orElse(null);
            if (o != null && !"CANCELLED".equals(o.getCurrentStageCode()) && !"NO_SHOW".equals(o.getCurrentStageCode())) {
                next = m("kind", "BOOKING", "orderId", b.getOrderId(), "date", b.getDate(), "time", b.getSlotStart(), "partySize", b.getPartySize());
                break;
            }
        }
        if (next == null) {
            for (OrderDto o : mine) {
                if (PlaisirWorkflowSeeder.GATHERING.equals(o.getWorkflowCode()) && !Set.of("FULFILLED", "CANCELLED").contains(o.getCurrentStageCode())) {
                    next = m("kind", "GATHERING", "orderId", o.getId(), "stage", o.getCurrentStageCode());
                    break;
                }
            }
        }
        if (next == null) {
            for (OrderDto o : mine) {
                if (PlaisirWorkflowSeeder.PICKUP.equals(o.getWorkflowCode()) && !"CANCELLED".equals(o.getCurrentStageCode())) {
                    List<Map<String, Object>> lines = new ArrayList<>();
                    for (OrderDto.OrderItemDto it : o.getItems())
                        lines.add(m("itemId", it.getItemId(), "name", it.getName(), "unitPrice", it.getUnitPrice(), "quantity", it.getQuantity(), "imageUrl", it.getImageUrl()));
                    next = m("kind", "REORDER", "orderId", o.getId(), "lines", lines);
                    break;
                }
            }
        }
        return m("firstName", u.getFirstName(), "coins", balance, "next", next);
    }

    public List<Map<String, Object>> checklist(Integer userId) {
        auth(userId);
        User u = users.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        List<OrderDto> mine = orders.myOrders(userId);
        boolean pickup = mine.stream().anyMatch(o -> PlaisirWorkflowSeeder.PICKUP.equals(o.getWorkflowCode()));
        boolean macaron = mine.stream().anyMatch(o -> PlaisirWorkflowSeeder.PICKUP.equals(o.getWorkflowCode())
                && o.getItems().stream().anyMatch(i -> i.getName() != null && i.getName().startsWith("Macaron box")));
        boolean table = mine.stream().anyMatch(o -> PlaisirWorkflowSeeder.TABLE.equals(o.getWorkflowCode()));
        boolean team = mine.stream().anyMatch(o -> PlaisirWorkflowSeeder.GATHERING.equals(o.getWorkflowCode()));
        boolean feedback = mine.stream().anyMatch(OrderDto::isFeedbackSubmitted);
        List<Map<String, Object>> out = new ArrayList<>();
        out.add(item("profile", "Complete your profile", u.getPhone() != null && u.getFirstName() != null, "/account", false));
        out.add(item("table", "Book a table", table, "/book", false));
        out.add(item("pickup", "Order something for pickup", pickup, "/order", false));
        out.add(item("macaron", "Build a macaron box", macaron, "/patisserie", false));
        out.add(item("team", "Send a team-lunch request", team, "/team-lunch", true));
        out.add(item("favourite", "Save a favourite", !favourites.findByUserId(userId).isEmpty(), "/menu", false));
        out.add(item("feedback", "Share feedback on an order", feedback, "/orders", false));
        out.add(item("suggestion", "Suggest an idea", !suggestions.findByUserIdOrderByCreatedAtDesc(userId).isEmpty(), "/ideas", false));
        return out;
    }

    private Map<String, Object> item(String id, String label, boolean done, String href, boolean optional) {
        return m("id", id, "label", label, "done", done, "href", href, "optional", optional);
    }

    // ── Suggestions ──

    @Transactional
    public Map<String, Object> suggest(Integer userId, Map<String, Object> req) {
        auth(userId);
        String text = str(req.get("text"));
        if (text == null || text.trim().length() < 5) throw bad("Tell us a little more (at least 5 characters)");
        if (text.length() > 500) throw bad("Ideas are limited to 500 characters");
        Instant now = Instant.now();
        Suggestion s = suggestions.save(Suggestion.builder().userId(userId).text(text.trim()).createdAt(now).updatedAt(now).build());
        loyaltyEvents.record(userId, LoyaltyEventType.SUGGESTION, null, Map.of("suggestionId", s.getId()));
        return m("id", s.getId());
    }

    public List<Suggestion> mySuggestions(Integer userId) { return suggestions.findByUserIdOrderByCreatedAtDesc(userId); }

    public List<Map<String, Object>> actedOn() {
        return suggestions.findByShowPublicTrueAndStatus(SuggestionStatus.DONE).stream()
                .map(s -> m("id", s.getId(), "text", s.getText(), "publicNote", s.getPublicNote())).toList();
    }

    public List<Suggestion> adminSuggestions() { return suggestions.findAllByOrderByCreatedAtDesc(); }

    @Transactional
    public Suggestion updateSuggestion(Long id, Map<String, Object> r) {
        Suggestion s = suggestions.findById(id).orElseThrow(() -> new ResourceNotFoundException("Not found"));
        if (r.get("status") != null) s.setStatus(SuggestionStatus.valueOf(String.valueOf(r.get("status"))));
        if (r.containsKey("publicNote")) s.setPublicNote(blankToNull(str(r.get("publicNote"))));
        if (r.get("showPublic") != null) s.setShowPublic(bool(r.get("showPublic")));
        s.setUpdatedAt(Instant.now());
        audit.record("PLAISIR_SUGGESTION_UPDATED", AuditActions.SUCCESS, "SUGGESTION", String.valueOf(id), "status=" + s.getStatus());
        return suggestions.save(s);
    }

    @Transactional
    public BulkUploadResult bulkSuggestions(MultipartFile file) {
        BulkUploadResult res = new BulkUploadResult();
        int row = 1;
        for (Map<String, String> r : parser.parse(file)) {
            row++;
            try {
                String text = r.get("text");
                if (text == null || text.isBlank() || text.length() > 500) { res.addError(row, "text is required (max 500 characters)"); continue; }
                Instant now = Instant.now();
                SuggestionStatus st = r.get("status") == null || r.get("status").isBlank() ? SuggestionStatus.NEW : SuggestionStatus.valueOf(r.get("status").toUpperCase());
                suggestions.save(Suggestion.builder().text(text).status(st).publicNote(blankToNull(r.get("publicnote"))).showPublic(Boolean.parseBoolean(r.get("showpublic"))).createdAt(now).updatedAt(now).build());
                res.setCreated(res.getCreated() + 1);
            } catch (Exception e) { res.addError(row, e.getMessage()); }
        }
        audit.record("PLAISIR_SUGGESTION_UPDATED", AuditActions.SUCCESS, "SUGGESTION", "bulk", "rows=" + (row - 1));
        return res;
    }
}
