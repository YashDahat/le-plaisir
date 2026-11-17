package com.webappfoundation.plaisir;

import com.webappfoundation.dto.BulkUploadResult;
import com.webappfoundation.plaisir.PlaisirModel.*;
import com.webappfoundation.security.CurrentUser;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static com.webappfoundation.plaisir.PlaisirService.auth;

/** Public + signed-in endpoints. SecurityConfig permits /api/v1/plaisir/**, so auth is enforced here. */
@RestController
@RequestMapping("/api/v1/plaisir")
public class PlaisirController {
    private final PlaisirService svc;
    private final PlaisirEngagementService eng;

    public PlaisirController(PlaisirService svc, PlaisirEngagementService eng) { this.svc = svc; this.eng = eng; }

    @GetMapping("/menu") public List<Map<String, Object>> menu() { return svc.menu(); }
    @GetMapping("/menu/{slug}") public Map<String, Object> dish(@PathVariable String slug) { return svc.dishBySlug(slug); }
    @GetMapping("/vitrine") public List<Map<String, Object>> vitrine() { return svc.vitrine(); }
    @GetMapping("/macaron-flavours") public List<MacaronFlavour> flavours() { return svc.macaronFlavours(); }
    @GetMapping("/story") public List<StoryBeat> story() { return svc.story(); }
    @GetMapping("/ways-to-earn") public List<Map<String, Object>> ways() { return eng.waysToEarn(); }

    @GetMapping("/pickup/slots")
    public List<Map<String, Object>> slots(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date, @RequestParam(defaultValue = "false") boolean lead) {
        return svc.pickupSlots(date, lead);
    }

    @PostMapping("/pickup-details")
    public Map<String, Object> pickup(@CurrentUser Integer userId, @RequestBody Map<String, Object> body) { return svc.attachPickup(userId, body); }

    @GetMapping("/orders/{orderId}/details")
    public Map<String, Object> details(@CurrentUser Integer userId, @PathVariable Long orderId) { return svc.orderDetails(userId, orderId); }

    @GetMapping("/bookings/availability")
    public List<Map<String, Object>> availability(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date, @RequestParam(defaultValue = "2") int party) {
        return svc.availability(date, party);
    }

    @PostMapping("/bookings")
    public Map<String, Object> book(@CurrentUser Integer userId, @RequestBody Map<String, Object> body) { return svc.createBooking(userId, body); }

    @GetMapping("/bookings/mine")
    public List<BookingDetail> myBookings(@CurrentUser Integer userId) { auth(userId); return svc.myBookings(userId); }

    @GetMapping("/bookings/{orderId}/ics")
    public ResponseEntity<String> ics(@CurrentUser Integer userId, @PathVariable Long orderId) {
        auth(userId);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("text/calendar"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=le-plaisir-table.ics").body(svc.ics(userId, orderId));
    }

    @PostMapping("/gatherings")
    public Map<String, Object> gathering(@CurrentUser Integer userId, @RequestBody Map<String, Object> body) { return svc.createGathering(userId, body); }

    @GetMapping("/gatherings/mine")
    public List<GatheringDetail> myGatherings(@CurrentUser Integer userId) { auth(userId); return svc.myGatherings(userId); }

    @GetMapping("/me/welcome") public Map<String, Object> welcome(@CurrentUser Integer userId) { return eng.welcome(userId); }
    @GetMapping("/me/checklist") public List<Map<String, Object>> checklist(@CurrentUser Integer userId) { return eng.checklist(userId); }

    @GetMapping("/favourites") public List<Long> favourites(@CurrentUser Integer userId) { auth(userId); return svc.favouriteIds(userId); }
    @PostMapping("/favourites/{productId}/toggle")
    public Map<String, Object> toggle(@CurrentUser Integer userId, @PathVariable Long productId) { auth(userId); return svc.toggleFavourite(userId, productId); }

    @PostMapping("/suggestions") public Map<String, Object> suggest(@CurrentUser Integer userId, @RequestBody Map<String, Object> body) { return eng.suggest(userId, body); }
    @GetMapping("/suggestions/mine") public List<Suggestion> mine(@CurrentUser Integer userId) { auth(userId); return eng.mySuggestions(userId); }
    @GetMapping("/suggestions/acted-on") public List<Map<String, Object>> actedOn() { return eng.actedOn(); }
}
