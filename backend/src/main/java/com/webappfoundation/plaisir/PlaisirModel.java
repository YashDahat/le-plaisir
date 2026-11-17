package com.webappfoundation.plaisir;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/** Site-owned entities for Le Plaisir (all link users by Integer userId and orders by Long orderId). */
public final class PlaisirModel {
    private PlaisirModel() {}

    public enum Diet { VEG, EGG, NON_VEG }
    public enum BlackoutScope { TABLE, PICKUP, ALL }
    public enum GatheringType { TEAM_LUNCH, LARGE_TABLE }
    public enum GatheringMode { PICKUP, DINE_IN, DISCUSS_DELIVERY }
    public enum SuggestionStatus { NEW, PLANNED, DONE }

    @Entity @Table(name = "plaisir_dish_info") @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DishInfo {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @Column(nullable = false, unique = true) private Long productId;
        /** Dishes sold in portions share a groupKey (one Product per portion; variant pricing is not honoured by the order spine). */
        private String groupKey;
        private String portion;
        @Enumerated(EnumType.STRING) @Column(nullable = false) @Builder.Default private Diet diet = Diet.VEG;
        @Builder.Default private boolean signature = false;
        @Builder.Default private boolean requestOnly = false;
        @Builder.Default private int leadHours = 0;
        @Builder.Default private boolean priceConfirmed = false;
        @Builder.Default private boolean inVitrineToday = false;
        @Builder.Default private boolean soldOutToday = false;
        private LocalTime availableFrom;
        private LocalTime availableTo;
        @Builder.Default private int sortOrder = 0;
        private String shortNote;
    }

    @Entity @Table(name = "plaisir_macaron_flavour") @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MacaronFlavour {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @Column(nullable = false, unique = true) private String name;
        private String colourHex;
        @Builder.Default private boolean available = true;
        @Builder.Default private int sortOrder = 0;
    }

    @Entity @Table(name = "plaisir_pickup_detail") @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PickupDetail {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @Column(nullable = false, unique = true) private Long orderId;
        private Integer userId;
        private LocalDateTime pickupAt;
        private String counterName;
        private String cakeMessage;
        @Column(columnDefinition = "text") private String flavours;
        @Column(columnDefinition = "text") private String note;
        private Instant createdAt;
    }

    @Entity @Table(name = "plaisir_pickup_settings") @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PickupSettings {
        @Id private Long id;
        @Builder.Default private int slotMinutes = 15;
        @Builder.Default private int maxOrdersPerSlot = 8;
        @Builder.Default private LocalTime openFrom = LocalTime.of(8, 30);
        @Builder.Default private LocalTime lastPickup = LocalTime.of(22, 15);
        @Builder.Default private int minLeadMinutes = 30;
    }

    @Entity @Table(name = "plaisir_table_capacity") @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TableSlotCapacity {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @Column(nullable = false) private int weekday;
        @Column(nullable = false) private LocalTime slotStart;
        @Column(nullable = false) private int covers;
    }

    @Entity @Table(name = "plaisir_blackout") @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class BlackoutDate {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @Column(nullable = false) private LocalDate date;
        @Enumerated(EnumType.STRING) @Column(nullable = false) private BlackoutScope scope;
        private String reason;
    }

    @Entity @Table(name = "plaisir_booking_detail") @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class BookingDetail {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @Column(nullable = false, unique = true) private Long orderId;
        private Integer userId;
        private LocalDate date;
        private LocalTime slotStart;
        private int partySize;
        private String seatingPref;
        private String occasion;
        private String phone;
        @Column(columnDefinition = "text") private String note;
        private Instant createdAt;
    }

    @Entity @Table(name = "plaisir_gathering_detail") @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class GatheringDetail {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @Column(nullable = false, unique = true) private Long orderId;
        private Integer userId;
        @Enumerated(EnumType.STRING) private GatheringType type;
        private String groupName;
        private LocalDate date;
        private LocalTime time;
        private int headcount;
        private int vegCount;
        private String budgetBand;
        @Enumerated(EnumType.STRING) private GatheringMode mode;
        private String phone;
        private String email;
        @Column(columnDefinition = "text") private String note;
        @Column(columnDefinition = "text") private String quoteNote;
        private BigDecimal quotedTotal;
        private Instant createdAt;
    }

    @Entity @Table(name = "plaisir_suggestion") @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Suggestion {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        private Integer userId;
        @Column(nullable = false, length = 500) private String text;
        @Enumerated(EnumType.STRING) @Builder.Default private SuggestionStatus status = SuggestionStatus.NEW;
        @Column(columnDefinition = "text") private String publicNote;
        @Builder.Default private boolean showPublic = false;
        private Instant createdAt;
        private Instant updatedAt;
    }

    @Entity @Table(name = "plaisir_favourite", uniqueConstraints = @UniqueConstraint(columnNames = {"userId", "productId"}))
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Favourite {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        @Column(nullable = false) private Integer userId;
        @Column(nullable = false) private Long productId;
        private Instant createdAt;
    }

    @Entity @Table(name = "plaisir_story_beat") @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class StoryBeat {
        @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
        private String yearLabel;
        private String title;
        @Column(columnDefinition = "text") private String body;
        private String sourceNote;
        @Builder.Default private int sortOrder = 0;
    }
}
