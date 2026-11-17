package com.webappfoundation.plaisir;

import com.webappfoundation.dto.BulkUploadResult;
import com.webappfoundation.plaisir.PlaisirModel.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** ADMIN-gated by SecurityConfig (/api/v1/admin/**). Every mutation is audited inside the services. */
@RestController
@RequestMapping("/api/v1/admin/plaisir")
public class AdminPlaisirController {
    private final PlaisirService svc;
    private final PlaisirEngagementService eng;

    public AdminPlaisirController(PlaisirService svc, PlaisirEngagementService eng) { this.svc = svc; this.eng = eng; }

    @GetMapping("/dishes") public List<Map<String, Object>> dishes() { return svc.adminDishes(); }
    @PutMapping("/dishes/{id}") public Map<String, Object> dish(@PathVariable Long id, @RequestBody Map<String, Object> b) { return svc.updateDish(id, b); }
    @PostMapping(value = "/dishes/bulk-upload", consumes = "multipart/form-data")
    public BulkUploadResult dishesBulk(@RequestParam("file") MultipartFile f) { return svc.bulkDishes(f); }
    @PutMapping("/vitrine/{id}") public Map<String, Object> vitrine(@PathVariable Long id, @RequestBody Map<String, Object> b) { return svc.toggleVitrine(id, b); }

    @GetMapping("/pickup-settings") public PickupSettings settings() { return svc.getSettings(); }
    @PutMapping("/pickup-settings") public PickupSettings putSettings(@RequestBody Map<String, Object> b) { return svc.putSettings(b); }
    @GetMapping("/pickup-details") public List<PickupDetail> pickups(@RequestParam List<Long> orderIds) { return svc.pickupDetails(orderIds); }

    @GetMapping("/table-capacity") public List<TableSlotCapacity> capacity() { return svc.capacities(); }
    @PostMapping("/table-capacity") public TableSlotCapacity addCap(@RequestBody Map<String, Object> b) { return svc.saveCapacity(null, b); }
    @PutMapping("/table-capacity/{id}") public TableSlotCapacity putCap(@PathVariable Long id, @RequestBody Map<String, Object> b) { return svc.saveCapacity(id, b); }
    @DeleteMapping("/table-capacity/{id}") public ResponseEntity<Void> delCap(@PathVariable Long id) { svc.deleteCapacity(id); return ResponseEntity.noContent().build(); }
    @PostMapping(value = "/table-capacity/bulk-upload", consumes = "multipart/form-data")
    public BulkUploadResult capBulk(@RequestParam("file") MultipartFile f) { return svc.bulkCapacity(f); }

    @GetMapping("/blackouts") public List<BlackoutDate> blackouts() { return svc.blackoutList(); }
    @PostMapping("/blackouts") public BlackoutDate addBlackout(@RequestBody Map<String, Object> b) { return svc.addBlackout(b); }
    @DeleteMapping("/blackouts/{id}") public ResponseEntity<Void> delBlackout(@PathVariable Long id) { svc.deleteBlackout(id); return ResponseEntity.noContent().build(); }

    @GetMapping("/bookings")
    public List<Map<String, Object>> bookings(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                              @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate f = from == null ? LocalDate.now(PlaisirService.IST) : from;
        return svc.adminBookings(f, to == null ? f.plusDays(30) : to);
    }

    @GetMapping("/gatherings") public List<Map<String, Object>> gatherings() { return svc.adminGatherings(); }
    @PutMapping("/gatherings/{id}/quote") public Map<String, Object> quote(@PathVariable Long id, @RequestBody Map<String, Object> b) { return svc.quote(id, b); }

    @GetMapping("/flavours") public List<MacaronFlavour> flavours() { return svc.adminFlavours(); }
    @PostMapping("/flavours") public MacaronFlavour addFlavour(@RequestBody Map<String, Object> b) { return svc.saveFlavour(null, b); }
    @PutMapping("/flavours/{id}") public MacaronFlavour putFlavour(@PathVariable Long id, @RequestBody Map<String, Object> b) { return svc.saveFlavour(id, b); }
    @PostMapping(value = "/flavours/bulk-upload", consumes = "multipart/form-data")
    public BulkUploadResult flavBulk(@RequestParam("file") MultipartFile f) { return svc.bulkFlavours(f); }

    @GetMapping("/suggestions") public List<Suggestion> suggestions() { return eng.adminSuggestions(); }
    @PutMapping("/suggestions/{id}") public Suggestion putSuggestion(@PathVariable Long id, @RequestBody Map<String, Object> b) { return eng.updateSuggestion(id, b); }
    @PostMapping(value = "/suggestions/bulk-upload", consumes = "multipart/form-data")
    public BulkUploadResult sugBulk(@RequestParam("file") MultipartFile f) { return eng.bulkSuggestions(f); }

    @GetMapping("/story") public List<StoryBeat> story() { return svc.story(); }
    @PostMapping("/story") public StoryBeat addStory(@RequestBody Map<String, Object> b) { return svc.saveStory(null, b); }
    @PutMapping("/story/{id}") public StoryBeat putStory(@PathVariable Long id, @RequestBody Map<String, Object> b) { return svc.saveStory(id, b); }
}
