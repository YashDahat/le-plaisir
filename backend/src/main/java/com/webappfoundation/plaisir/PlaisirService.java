package com.webappfoundation.plaisir;

import com.webappfoundation.dto.*;
import com.webappfoundation.exception.ResourceNotFoundException;
import com.webappfoundation.model.*;
import com.webappfoundation.plaisir.PlaisirModel.*;
import com.webappfoundation.repository.OrderRepository;
import com.webappfoundation.repository.ProductRepository;
import com.webappfoundation.repository.UserRepository;
import com.webappfoundation.service.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

/** Menu, pickup, table booking, team lunches, favourites and story for Le Plaisir. Orders only via OrderService. */
@Service
public class PlaisirService {
    static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    private static final Set<String> DEAD_STAGES = Set.of("CANCELLED", "NO_SHOW");

    private final ProductRepository products;
    private final DishInfoRepo dishes;
    private final FlavourRepo flavours;
    private final PickupDetailRepo pickups;
    private final PickupSettingsRepo settingsRepo;
    private final CapacityRepo capacityRepo;
    private final BlackoutRepo blackouts;
    private final BookingRepo bookings;
    private final GatheringRepo gatherings;
    private final FavouriteRepo favourites;
    private final StoryRepo story;
    private final OrderService orderService;
    private final OrderRepository orderRepository;
    private final AuditService audit;
    private final SpreadsheetParser parser;

    public PlaisirService(ProductRepository products, DishInfoRepo dishes, FlavourRepo flavours, PickupDetailRepo pickups,
                          PickupSettingsRepo settingsRepo, CapacityRepo capacityRepo, BlackoutRepo blackouts,
                          BookingRepo bookings, GatheringRepo gatherings, FavouriteRepo favourites, StoryRepo story,
                          OrderService orderService, OrderRepository orderRepository, AuditService audit,
                          SpreadsheetParser parser) {
        this.products = products; this.dishes = dishes; this.flavours = flavours; this.pickups = pickups;
        this.settingsRepo = settingsRepo; this.capacityRepo = capacityRepo; this.blackouts = blackouts;
        this.bookings = bookings; this.gatherings = gatherings; this.favourites = favourites; this.story = story;
        this.orderService = orderService; this.orderRepository = orderRepository; this.audit = audit; this.parser = parser;
    }

    static Map<String, Object> m(Object... kv) {
        Map<String, Object> out = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) out.put((String) kv[i], kv[i + 1]);
        return out;
    }

    static ResponseStatusException bad(String msg) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg); }

    static void auth(Integer userId) {
        if (userId == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in");
    }

    // ───────────── Menu ─────────────

    public List<Map<String, Object>> menu() {
        Map<Long, DishInfo> info = dishes.findAll().stream().collect(Collectors.toMap(DishInfo::getProductId, d -> d));
        Map<String, Map<String, Object>> groups = new LinkedHashMap<>();
        List<Product> all = products.findByActiveTrue().stream()
                .filter(p -> info.containsKey(p.getId()) && !info.get(p.getId()).isRequestOnly())
                .sorted(Comparator.comparingInt(p -> info.get(p.getId()).getSortOrder())).toList();
        for (Product p : all) {
            DishInfo d = info.get(p.getId());
            String key = d.getGroupKey() != null ? d.getGroupKey() : p.getSlug();
            @SuppressWarnings("unchecked")
            Map<String, Object> g = groups.computeIfAbsent(key, k -> {
                String name = d.getPortion() != null ? p.getName().replaceAll(" \\((Small|Large)\\)$", "") : p.getName();
                return m("key", key, "name", name, "slug", p.getSlug(), "category", p.getCategory(), "diet", d.getDiet(),
                        "signature", d.isSignature(), "shortNote", d.getShortNote(), "priceConfirmed", d.isPriceConfirmed(),
                        "inVitrineToday", d.isInVitrineToday(), "soldOutToday", d.isSoldOutToday(), "leadHours", d.getLeadHours(),
                        "availableFrom", d.getAvailableFrom() == null ? null : d.getAvailableFrom().toString(),
                        "availableTo", d.getAvailableTo() == null ? null : d.getAvailableTo().toString(),
                        "imageUrl", p.getImageUrl(), "description", p.getDescription(), "options", new ArrayList<Map<String, Object>>());
            });
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> opts = (List<Map<String, Object>>) g.get("options");
            opts.add(m("productId", p.getId(), "portion", d.getPortion(), "price", p.getPrice(), "slug", p.getSlug(), "name", p.getName()));
        }
        return new ArrayList<>(groups.values());
    }

    public Map<String, Object> dishBySlug(String slug) {
        Product p = products.findBySlug(slug).orElseThrow(() -> new ResourceNotFoundException("Dish not found"));
        return menu().stream().filter(g -> ((List<?>) g.get("options")).stream()
                .anyMatch(o -> p.getId().equals(((Map<?, ?>) o).get("productId")))).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Dish not found"));
    }

    public List<Map<String, Object>> vitrine() {
        return menu().stream().filter(g -> Boolean.TRUE.equals(g.get("inVitrineToday"))).toList();
    }

    public List<MacaronFlavour> macaronFlavours() { return flavours.findByAvailableTrueOrderBySortOrderAsc(); }

    public List<StoryBeat> story() { return story.findAllByOrderBySortOrderAsc(); }

    // ───────────── Favourites ─────────────

    public List<Long> favouriteIds(Integer userId) {
        return favourites.findByUserId(userId).stream().map(Favourite::getProductId).toList();
    }

    @Transactional
    public Map<String, Object> toggleFavourite(Integer userId, Long productId) {
        Optional<Favourite> f = favourites.findByUserIdAndProductId(userId, productId);
        if (f.isPresent()) { favourites.delete(f.get()); return m("favourite", false); }
        favourites.save(Favourite.builder().userId(userId).productId(productId).createdAt(Instant.now()).build());
        return m("favourite", true);
    }

    // ───────────── Pickup ─────────────

    PickupSettings settings() {
        return settingsRepo.findById(1L).orElseGet(() -> settingsRepo.save(PickupSettings.builder().id(1L).build()));
    }

    private boolean blackedOut(LocalDate d, BlackoutScope scope) {
        return blackouts.findByDate(d).stream().anyMatch(b -> b.getScope() == BlackoutScope.ALL || b.getScope() == scope);
    }

    public List<Map<String, Object>> pickupSlots(LocalDate date, boolean lead) {
        PickupSettings s = settings();
        LocalDateTime earliest = LocalDateTime.now(IST).plusMinutes(s.getMinLeadMinutes());
        if (lead) earliest = LocalDateTime.now(IST).plusHours(24);
        List<Map<String, Object>> out = new ArrayList<>();
        if (blackedOut(date, BlackoutScope.PICKUP)) return out;
        for (LocalTime t = s.getOpenFrom(); !t.isAfter(s.getLastPickup()); t = t.plusMinutes(s.getSlotMinutes())) {
            LocalDateTime at = date.atTime(t);
            long load = pickups.countByPickupAt(at);
            boolean ok = !at.isBefore(earliest) && load < s.getMaxOrdersPerSlot();
            out.add(m("time", t.toString(), "at", at.toString(), "available", ok, "left", Math.max(0, s.getMaxOrdersPerSlot() - load)));
        }
        return out;
    }

    @Transactional
    public Map<String, Object> attachPickup(Integer userId, Map<String, Object> req) {
        auth(userId);
        Long orderId = Long.valueOf(String.valueOf(req.get("orderId")));
        OrderDto order = orderService.get(userId, orderId);
        if (!PlaisirWorkflowSeeder.PICKUP.equals(order.getWorkflowCode())) throw bad("This is not a pickup order");
        if (order.getCreatedAt().isBefore(Instant.now().minusSeconds(900))) throw bad("This order is too old to add pickup details");
        if (pickups.findByOrderId(orderId).isPresent()) throw bad("Pickup details already saved");
        LocalDateTime at;
        try { at = LocalDateTime.parse(String.valueOf(req.get("pickupAt"))); } catch (Exception e) { throw bad("Choose a pickup time"); }
        String name = str(req.get("counterName"));
        if (name == null || name.isBlank() || name.length() > 60) throw bad("Add a name for the counter");
        String cake = str(req.get("cakeMessage"));
        if (cake != null && cake.length() > 40) throw bad("Cake message is limited to 40 characters");
        String note = str(req.get("note"));
        if (note != null && note.length() > 200) throw bad("Note is limited to 200 characters");

        PickupSettings s = settings();
        int lead = 0; boolean windowed = false; LocalTime wf = null, wt = null;
        Map<Long, DishInfo> info = dishes.findByProductIdIn(order.getItems().stream().map(OrderDto.OrderItemDto::getItemId).toList())
                .stream().collect(Collectors.toMap(DishInfo::getProductId, d -> d));
        for (OrderDto.OrderItemDto it : order.getItems()) {
            DishInfo d = info.get(it.getItemId());
            if (d == null) continue;
            lead = Math.max(lead, d.getLeadHours());
            if (d.getAvailableFrom() != null) { windowed = true; wf = d.getAvailableFrom(); wt = d.getAvailableTo(); }
        }
        LocalDateTime earliest = LocalDateTime.now(IST).plusMinutes(s.getMinLeadMinutes()).plusHours(lead);
        if (at.isBefore(earliest)) throw bad("That pickup time is too soon for this bag");
        LocalTime t = at.toLocalTime();
        if (t.isBefore(s.getOpenFrom()) || t.isAfter(s.getLastPickup()) || (t.getMinute() % s.getSlotMinutes()) != 0) throw bad("Choose one of the listed pickup slots");
        if (blackedOut(at.toLocalDate(), BlackoutScope.PICKUP)) throw bad("We cannot take pickups on that day");
        if (windowed) {
            DayOfWeek dow = at.getDayOfWeek();
            if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY || t.isBefore(wf) || t.isAfter(wt))
                throw bad("Desk lunch sets are for weekdays, 11:30 am to 3:30 pm");
        }
        if (pickups.countByPickupAt(at) >= s.getMaxOrdersPerSlot()) throw bad("That slot is full. Please pick another.");
        pickups.save(PickupDetail.builder().orderId(orderId).userId(userId).pickupAt(at).counterName(name.trim())
                .cakeMessage(blankToNull(cake)).flavours(blankToNull(str(req.get("flavours")))).note(blankToNull(note)).createdAt(Instant.now()).build());
        return m("orderId", orderId, "pickupAt", at.toString());
    }

    // ───────────── Table booking ─────────────

    private int capacityFor(LocalDate date, LocalTime slot) {
        return capacityRepo.findByWeekdayAndSlotStart(date.getDayOfWeek().getValue(), slot).map(TableSlotCapacity::getCovers).orElse(0);
    }

    private boolean orderActive(Long orderId) {
        return orderRepository.findById(orderId).map(o -> !DEAD_STAGES.contains(o.getCurrentStageCode())).orElse(false);
    }

    private int booked(LocalDate date, LocalTime slot) {
        return bookings.findByDateAndSlotStart(date, slot).stream().filter(b -> orderActive(b.getOrderId())).mapToInt(BookingDetail::getPartySize).sum();
    }

    public List<Map<String, Object>> availability(LocalDate date, int party) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (blackedOut(date, BlackoutScope.TABLE)) return out;
        LocalDateTime now = LocalDateTime.now(IST);
        for (TableSlotCapacity c : capacityRepo.findByWeekday(date.getDayOfWeek().getValue()).stream()
                .sorted(Comparator.comparing(TableSlotCapacity::getSlotStart)).toList()) {
            int left = c.getCovers() - booked(date, c.getSlotStart());
            boolean past = date.atTime(c.getSlotStart()).isBefore(now);
            String status = past || left < party ? "full" : (left <= party + 6 ? "few" : "open");
            out.add(m("time", c.getSlotStart().toString(), "status", status, "left", Math.max(0, left)));
        }
        return out;
    }

    private Long requestProductId(String slug) {
        return products.findBySlug(slug).orElseThrow(() -> new ResourceNotFoundException("Request item missing: " + slug)).getId();
    }

    private OrderDto placeRequest(Integer userId, String slug) {
        return orderService.placeOrder(userId, PlaceOrderRequest.builder()
                .items(List.of(CartLineInput.builder().itemType("PRODUCT").itemId(requestProductId(slug)).quantity(1).build()))
                .fulfillmentType(FulfillmentType.SELF_PICKUP).paymentMode(PaymentMode.PAY_AT_COUNTER).build());
    }

    static final java.util.regex.Pattern PHONE = java.util.regex.Pattern.compile("^(\\+91)?[6-9]\\d{9}$");

    static String cleanPhone(String p) {
        String c = p == null ? "" : p.replaceAll("[\\s-]", "");
        if (!PHONE.matcher(c).matches()) throw bad("Enter a valid Indian mobile number");
        return c;
    }

    @Transactional
    public Map<String, Object> createBooking(Integer userId, Map<String, Object> req) {
        auth(userId);
        LocalDate date; LocalTime slot; int party;
        try {
            date = LocalDate.parse(String.valueOf(req.get("date")));
            slot = LocalTime.parse(String.valueOf(req.get("slot")));
            party = Integer.parseInt(String.valueOf(req.get("partySize")));
        } catch (Exception e) { throw bad("Choose a date, a time and a party size"); }
        LocalDate today = LocalDate.now(IST);
        if (date.isBefore(today) || date.isAfter(today.plusDays(30))) throw bad("Bookings open for the next 30 days");
        if (party < 1 || party > 10) throw bad("For parties above 10, please use Team lunches & large tables");
        if (blackedOut(date, BlackoutScope.TABLE)) throw bad("We are not taking bookings on that day");
        if (date.atTime(slot).isBefore(LocalDateTime.now(IST))) throw bad("That time has passed");
        int cap = capacityFor(date, slot);
        if (cap == 0) throw bad("Choose one of the listed times");
        if (booked(date, slot) + party > cap) throw bad("That time is full. Please pick another.");
        if (bookings.findByDateAndSlotStart(date, slot).stream().anyMatch(b -> userId.equals(b.getUserId()) && orderActive(b.getOrderId())))
            throw bad("You already have a booking at that time");
        String phone = cleanPhone(str(req.get("phone")));
        String note = str(req.get("note"));
        if (note != null && note.length() > 200) throw bad("Note is limited to 200 characters");
        OrderDto order = placeRequest(userId, "table-request");
        bookings.save(BookingDetail.builder().orderId(order.getId()).userId(userId).date(date).slotStart(slot).partySize(party)
                .seatingPref(orDefault(str(req.get("seatingPref")), "No preference")).occasion(orDefault(str(req.get("occasion")), "none"))
                .phone(phone).note(blankToNull(note)).createdAt(Instant.now()).build());
        audit.record("PLAISIR_BOOKING_CREATED", AuditActions.SUCCESS, "ORDER", String.valueOf(order.getId()), "party=" + party);
        return m("orderId", order.getId());
    }

    public List<BookingDetail> myBookings(Integer userId) { return bookings.findByUserIdOrderByDateDesc(userId); }

    public String ics(Integer userId, Long orderId) {
        orderService.get(userId, orderId);
        BookingDetail b = bookings.findByOrderId(orderId).orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        String start = b.getDate().toString().replace("-", "") + "T" + b.getSlotStart().toString().replace(":", "") + "00";
        String end = b.getDate().toString().replace("-", "") + "T" + b.getSlotStart().plusHours(1).plusMinutes(30).toString().replace(":", "") + "00";
        return "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Le Plaisir//Booking//EN\r\nBEGIN:VEVENT\r\nUID:plaisir-" + orderId + "@leplaisir\r\n"
                + "DTSTAMP:" + start + "\r\nDTSTART;TZID=Asia/Kolkata:" + start + "\r\nDTEND;TZID=Asia/Kolkata:" + end + "\r\n"
                + "SUMMARY:Table at Le Plaisir (" + b.getPartySize() + ")\r\nLOCATION:Prabhat Road\\, Deccan Gymkhana\\, Pune 411004\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";
    }

    // ───────────── Team lunch / large table ─────────────

    @Transactional
    public Map<String, Object> createGathering(Integer userId, Map<String, Object> req) {
        auth(userId);
        GatheringType type; GatheringMode mode; LocalDate date; LocalTime time; int head, veg;
        try {
            type = GatheringType.valueOf(String.valueOf(req.get("type")));
            mode = GatheringMode.valueOf(String.valueOf(req.get("mode")));
            date = LocalDate.parse(String.valueOf(req.get("date")));
            time = LocalTime.parse(String.valueOf(req.get("time")));
            head = Integer.parseInt(String.valueOf(req.get("headcount")));
            veg = Integer.parseInt(String.valueOf(req.getOrDefault("vegCount", 0)));
        } catch (Exception e) { throw bad("Please fill in the type, date, time, headcount and how you would like it"); }
        String group = str(req.get("groupName"));
        if (group == null || group.isBlank() || group.length() > 80) throw bad("Add your company or group name");
        if (!date.isAfter(LocalDate.now(IST))) throw bad("Choose a date from tomorrow onwards");
        if (head < 11 || head > 60) throw bad("Headcount should be between 11 and 60");
        if (veg < 0 || veg > head) throw bad("Veg count cannot be more than the headcount");
        if (type == GatheringType.TEAM_LUNCH && (time.isBefore(LocalTime.of(11, 30)) || time.isAfter(LocalTime.of(15, 30))))
            throw bad("Team lunches run 11:30 am to 3:30 pm");
        String phone = cleanPhone(str(req.get("phone")));
        String email = str(req.get("email"));
        if (email != null && !email.isBlank() && !email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) throw bad("Enter a valid email or leave it blank");
        String note = str(req.get("note"));
        if (note != null && note.length() > 500) throw bad("Note is limited to 500 characters");
        OrderDto order = placeRequest(userId, type == GatheringType.TEAM_LUNCH ? "team-lunch-request" : "large-table-request-11-guests");
        gatherings.save(GatheringDetail.builder().orderId(order.getId()).userId(userId).type(type).groupName(group.trim()).date(date).time(time)
                .headcount(head).vegCount(veg).budgetBand(orDefault(str(req.get("budgetBand")), "Suggest for us")).mode(mode).phone(phone)
                .email(blankToNull(email)).note(blankToNull(note)).createdAt(Instant.now()).build());
        audit.record("PLAISIR_GATHERING_CREATED", AuditActions.SUCCESS, "ORDER", String.valueOf(order.getId()), "headcount=" + head);
        return m("orderId", order.getId());
    }

    public List<GatheringDetail> myGatherings(Integer userId) { return gatherings.findByUserIdOrderByCreatedAtDesc(userId); }

    public Map<String, Object> orderDetails(Integer userId, Long orderId) {
        auth(userId);
        orderService.get(userId, orderId);
        Optional<PickupDetail> p = pickups.findByOrderId(orderId);
        if (p.isPresent()) return m("kind", "PICKUP", "detail", p.get());
        Optional<BookingDetail> b = bookings.findByOrderId(orderId);
        if (b.isPresent()) return m("kind", "BOOKING", "detail", b.get());
        Optional<GatheringDetail> g = gatherings.findByOrderId(orderId);
        if (g.isPresent()) return m("kind", "GATHERING", "detail", g.get());
        return m("kind", "NONE", "detail", null);
    }

    // ───────────── Admin ─────────────

    public List<Map<String, Object>> adminDishes() {
        Map<Long, Product> byId = products.findAll().stream().collect(Collectors.toMap(Product::getId, p -> p));
        return dishes.findAll().stream().map(d -> {
            Product p = byId.get(d.getProductId());
            return m("id", d.getId(), "productId", d.getProductId(), "name", p == null ? "" : p.getName(), "slug", p == null ? "" : p.getSlug(),
                    "category", p == null ? "" : p.getCategory(), "price", p == null ? null : p.getPrice(), "diet", d.getDiet(),
                    "signature", d.isSignature(), "requestOnly", d.isRequestOnly(), "leadHours", d.getLeadHours(),
                    "priceConfirmed", d.isPriceConfirmed(), "inVitrineToday", d.isInVitrineToday(), "soldOutToday", d.isSoldOutToday(),
                    "shortNote", d.getShortNote());
        }).toList();
    }

    @Transactional
    public Map<String, Object> updateDish(Long id, Map<String, Object> req) {
        DishInfo d = dishes.findById(id).orElseThrow(() -> new ResourceNotFoundException("Dish not found"));
        applyDish(d, req);
        dishes.save(d);
        audit.record("PLAISIR_DISH_UPDATED", AuditActions.SUCCESS, "DISH", String.valueOf(id), "updated");
        return m("ok", true);
    }

    private void applyDish(DishInfo d, Map<String, Object> r) {
        if (r.get("diet") != null) d.setDiet(Diet.valueOf(String.valueOf(r.get("diet")).toUpperCase()));
        if (r.get("signature") != null) d.setSignature(bool(r.get("signature")));
        if (r.get("leadHours") != null) d.setLeadHours(Integer.parseInt(String.valueOf(r.get("leadHours"))));
        if (r.get("priceConfirmed") != null) d.setPriceConfirmed(bool(r.get("priceConfirmed")));
        if (r.get("inVitrineToday") != null) d.setInVitrineToday(bool(r.get("inVitrineToday")));
        if (r.get("soldOutToday") != null) d.setSoldOutToday(bool(r.get("soldOutToday")));
        if (r.containsKey("shortNote")) d.setShortNote(blankToNull(str(r.get("shortNote"))));
    }

    @Transactional
    public Map<String, Object> toggleVitrine(Long id, Map<String, Object> req) {
        DishInfo d = dishes.findById(id).orElseThrow(() -> new ResourceNotFoundException("Dish not found"));
        if (req.get("inVitrineToday") != null) d.setInVitrineToday(bool(req.get("inVitrineToday")));
        if (req.get("soldOutToday") != null) d.setSoldOutToday(bool(req.get("soldOutToday")));
        dishes.save(d);
        audit.record("PLAISIR_VITRINE_TOGGLED", AuditActions.SUCCESS, "DISH", String.valueOf(id), "vitrine=" + d.isInVitrineToday() + " soldOut=" + d.isSoldOutToday());
        return m("ok", true);
    }

    @Transactional
    public BulkUploadResult bulkDishes(MultipartFile file) {
        BulkUploadResult res = new BulkUploadResult();
        int row = 1;
        for (Map<String, String> r : parser.parse(file)) {
            row++;
            try {
                Product p = products.findBySlug(r.getOrDefault("slug", "")).orElse(null);
                DishInfo d = p == null ? null : dishes.findByProductId(p.getId()).orElse(null);
                if (d == null) { res.addError(row, "Unknown slug"); continue; }
                applyDish(d, new HashMap<>(r));
                dishes.save(d);
                res.setCreated(res.getCreated() + 1);
            } catch (Exception e) { res.addError(row, e.getMessage()); }
        }
        audit.record("PLAISIR_DISH_UPDATED", AuditActions.SUCCESS, "DISH", "bulk", "rows=" + (row - 1));
        return res;
    }

    public PickupSettings getSettings() { return settings(); }

    @Transactional
    public PickupSettings putSettings(Map<String, Object> r) {
        PickupSettings s = settings();
        if (r.get("slotMinutes") != null) s.setSlotMinutes(Math.max(5, Integer.parseInt(String.valueOf(r.get("slotMinutes")))));
        if (r.get("maxOrdersPerSlot") != null) s.setMaxOrdersPerSlot(Math.max(1, Integer.parseInt(String.valueOf(r.get("maxOrdersPerSlot")))));
        if (r.get("minLeadMinutes") != null) s.setMinLeadMinutes(Math.max(0, Integer.parseInt(String.valueOf(r.get("minLeadMinutes")))));
        if (r.get("openFrom") != null) s.setOpenFrom(LocalTime.parse(String.valueOf(r.get("openFrom"))));
        if (r.get("lastPickup") != null) s.setLastPickup(LocalTime.parse(String.valueOf(r.get("lastPickup"))));
        audit.record("PLAISIR_PICKUP_SETTINGS_UPDATED", AuditActions.SUCCESS, "SETTINGS", "1", "updated");
        return settingsRepo.save(s);
    }

    public List<PickupDetail> pickupDetails(List<Long> orderIds) { return pickups.findByOrderIdIn(orderIds); }

    public List<TableSlotCapacity> capacities() { return capacityRepo.findAll(); }

    @Transactional
    public TableSlotCapacity saveCapacity(Long id, Map<String, Object> r) {
        TableSlotCapacity c = id == null ? new TableSlotCapacity() : capacityRepo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Not found"));
        int wd = Integer.parseInt(String.valueOf(r.get("weekday")));
        if (wd < 1 || wd > 7) throw bad("Weekday is 1 (Mon) to 7 (Sun)");
        c.setWeekday(wd); c.setSlotStart(LocalTime.parse(String.valueOf(r.get("slotStart")))); c.setCovers(Math.max(0, Integer.parseInt(String.valueOf(r.get("covers")))));
        audit.record("PLAISIR_CAPACITY_UPDATED", AuditActions.SUCCESS, "CAPACITY", String.valueOf(id), "weekday=" + wd);
        return capacityRepo.save(c);
    }

    @Transactional
    public void deleteCapacity(Long id) { capacityRepo.deleteById(id); audit.record("PLAISIR_CAPACITY_UPDATED", AuditActions.SUCCESS, "CAPACITY", String.valueOf(id), "deleted"); }

    @Transactional
    public BulkUploadResult bulkCapacity(MultipartFile file) {
        BulkUploadResult res = new BulkUploadResult();
        int row = 1;
        for (Map<String, String> r : parser.parse(file)) {
            row++;
            try {
                int wd = Integer.parseInt(r.get("weekday")); LocalTime t = LocalTime.parse(r.get("slotstart")); int covers = Integer.parseInt(r.get("covers"));
                TableSlotCapacity c = capacityRepo.findByWeekdayAndSlotStart(wd, t).orElse(new TableSlotCapacity());
                c.setWeekday(wd); c.setSlotStart(t); c.setCovers(covers);
                capacityRepo.save(c); res.setCreated(res.getCreated() + 1);
            } catch (Exception e) { res.addError(row, "Expected weekday,slotStart,covers: " + e.getMessage()); }
        }
        audit.record("PLAISIR_CAPACITY_UPDATED", AuditActions.SUCCESS, "CAPACITY", "bulk", "rows=" + (row - 1));
        return res;
    }

    public List<BlackoutDate> blackoutList() { return blackouts.findAll(); }

    @Transactional
    public BlackoutDate addBlackout(Map<String, Object> r) {
        BlackoutDate b = BlackoutDate.builder().date(LocalDate.parse(String.valueOf(r.get("date"))))
                .scope(BlackoutScope.valueOf(String.valueOf(r.getOrDefault("scope", "ALL")))).reason(str(r.get("reason"))).build();
        audit.record("PLAISIR_BLACKOUT_UPDATED", AuditActions.SUCCESS, "BLACKOUT", b.getDate().toString(), "added");
        return blackouts.save(b);
    }

    @Transactional
    public void deleteBlackout(Long id) { blackouts.deleteById(id); audit.record("PLAISIR_BLACKOUT_UPDATED", AuditActions.SUCCESS, "BLACKOUT", String.valueOf(id), "removed"); }

    public List<Map<String, Object>> adminBookings(LocalDate from, LocalDate to) {
        return bookings.findByDateBetweenOrderByDateAscSlotStartAsc(from, to).stream().map(b -> {
            Order o = orderRepository.findById(b.getOrderId()).orElse(null);
            return m("id", b.getId(), "orderId", b.getOrderId(), "orderNumber", o == null ? null : o.getOrderNumber(), "stage", o == null ? null : o.getCurrentStageCode(),
                    "date", b.getDate(), "slotStart", b.getSlotStart(), "partySize", b.getPartySize(), "occasion", b.getOccasion(),
                    "seatingPref", b.getSeatingPref(), "phone", b.getPhone(), "note", b.getNote());
        }).toList();
    }

    public List<Map<String, Object>> adminGatherings() {
        return gatherings.findAllByOrderByCreatedAtDesc().stream().map(g -> {
            Order o = orderRepository.findById(g.getOrderId()).orElse(null);
            return m("id", g.getId(), "orderId", g.getOrderId(), "orderNumber", o == null ? null : o.getOrderNumber(), "stage", o == null ? null : o.getCurrentStageCode(),
                    "type", g.getType(), "groupName", g.getGroupName(), "date", g.getDate(), "time", g.getTime(), "headcount", g.getHeadcount(),
                    "vegCount", g.getVegCount(), "budgetBand", g.getBudgetBand(), "mode", g.getMode(), "phone", g.getPhone(), "email", g.getEmail(),
                    "note", g.getNote(), "quoteNote", g.getQuoteNote(), "quotedTotal", g.getQuotedTotal());
        }).toList();
    }

    @Transactional
    public Map<String, Object> quote(Long id, Map<String, Object> r) {
        GatheringDetail g = gatherings.findById(id).orElseThrow(() -> new ResourceNotFoundException("Request not found"));
        g.setQuoteNote(blankToNull(str(r.get("quoteNote"))));
        Object qt = r.get("quotedTotal");
        g.setQuotedTotal(qt == null || String.valueOf(qt).isBlank() ? null : new BigDecimal(String.valueOf(qt)));
        gatherings.save(g);
        audit.record("PLAISIR_GATHERING_QUOTED", AuditActions.SUCCESS, "GATHERING", String.valueOf(id), "quoted");
        return m("ok", true);
    }

    public List<MacaronFlavour> adminFlavours() { return flavours.findAll(); }

    @Transactional
    public MacaronFlavour saveFlavour(Long id, Map<String, Object> r) {
        MacaronFlavour f = id == null ? new MacaronFlavour() : flavours.findById(id).orElseThrow(() -> new ResourceNotFoundException("Not found"));
        String name = str(r.get("name"));
        if (name == null || name.isBlank()) throw bad("Flavour name is required");
        f.setName(name.trim()); f.setColourHex(orDefault(str(r.get("colourHex")), "#CCCCCC"));
        if (r.get("available") != null) f.setAvailable(bool(r.get("available")));
        else if (id == null) f.setAvailable(true);
        if (r.get("sortOrder") != null) f.setSortOrder(Integer.parseInt(String.valueOf(r.get("sortOrder"))));
        audit.record("PLAISIR_FLAVOUR_UPDATED", AuditActions.SUCCESS, "FLAVOUR", String.valueOf(id), name);
        return flavours.save(f);
    }

    @Transactional
    public BulkUploadResult bulkFlavours(MultipartFile file) {
        BulkUploadResult res = new BulkUploadResult();
        int row = 1;
        for (Map<String, String> r : parser.parse(file)) {
            row++;
            try {
                String name = r.get("name");
                if (name == null || name.isBlank()) { res.addError(row, "name is required"); continue; }
                if (flavours.findByNameIgnoreCase(name).isPresent()) { res.setSkipped(res.getSkipped() + 1); continue; }
                flavours.save(MacaronFlavour.builder().name(name).colourHex(orDefault(r.get("colourhex"), "#CCCCCC")).sortOrder(row).build());
                res.setCreated(res.getCreated() + 1);
            } catch (Exception e) { res.addError(row, e.getMessage()); }
        }
        audit.record("PLAISIR_FLAVOUR_UPDATED", AuditActions.SUCCESS, "FLAVOUR", "bulk", "rows=" + (row - 1));
        return res;
    }

    @Transactional
    public StoryBeat saveStory(Long id, Map<String, Object> r) {
        StoryBeat s = id == null ? new StoryBeat() : story.findById(id).orElseThrow(() -> new ResourceNotFoundException("Not found"));
        s.setYearLabel(str(r.get("yearLabel"))); s.setTitle(str(r.get("title"))); s.setBody(str(r.get("body"))); s.setSourceNote(str(r.get("sourceNote")));
        if (r.get("sortOrder") != null) s.setSortOrder(Integer.parseInt(String.valueOf(r.get("sortOrder"))));
        audit.record("PLAISIR_STORY_UPDATED", AuditActions.SUCCESS, "STORY", String.valueOf(id), "saved");
        return story.save(s);
    }

    // ───────────── helpers ─────────────

    static String str(Object o) { return o == null ? null : String.valueOf(o); }
    static String blankToNull(String s) { return s == null || s.isBlank() ? null : s.trim(); }
    static String orDefault(String s, String d) { return s == null || s.isBlank() ? d : s.trim(); }
    static boolean bool(Object o) { return o instanceof Boolean b ? b : Boolean.parseBoolean(String.valueOf(o)); }
}
