package com.webappfoundation.plaisir;

import com.webappfoundation.plaisir.PlaisirModel.*;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public final class PlaisirRepos {
    private PlaisirRepos() {}

    public interface DishInfoRepo extends JpaRepository<DishInfo, Long> {
        Optional<DishInfo> findByProductId(Long productId);
        List<DishInfo> findByProductIdIn(Collection<Long> ids);
        List<DishInfo> findByInVitrineTodayTrue();
    }
    public interface FlavourRepo extends JpaRepository<MacaronFlavour, Long> {
        List<MacaronFlavour> findByAvailableTrueOrderBySortOrderAsc();
        Optional<MacaronFlavour> findByNameIgnoreCase(String name);
    }
    public interface PickupDetailRepo extends JpaRepository<PickupDetail, Long> {
        Optional<PickupDetail> findByOrderId(Long orderId);
        List<PickupDetail> findByOrderIdIn(Collection<Long> ids);
        long countByPickupAt(LocalDateTime pickupAt);
    }
    public interface PickupSettingsRepo extends JpaRepository<PickupSettings, Long> {}
    public interface CapacityRepo extends JpaRepository<TableSlotCapacity, Long> {
        List<TableSlotCapacity> findByWeekday(int weekday);
        Optional<TableSlotCapacity> findByWeekdayAndSlotStart(int weekday, LocalTime slotStart);
    }
    public interface BlackoutRepo extends JpaRepository<BlackoutDate, Long> {
        List<BlackoutDate> findByDate(LocalDate date);
    }
    public interface BookingRepo extends JpaRepository<BookingDetail, Long> {
        Optional<BookingDetail> findByOrderId(Long orderId);
        List<BookingDetail> findByDateAndSlotStart(LocalDate date, LocalTime slotStart);
        List<BookingDetail> findByDate(LocalDate date);
        List<BookingDetail> findByUserIdOrderByDateDesc(Integer userId);
        List<BookingDetail> findByDateBetweenOrderByDateAscSlotStartAsc(LocalDate from, LocalDate to);
    }
    public interface GatheringRepo extends JpaRepository<GatheringDetail, Long> {
        Optional<GatheringDetail> findByOrderId(Long orderId);
        List<GatheringDetail> findByUserIdOrderByCreatedAtDesc(Integer userId);
        List<GatheringDetail> findAllByOrderByCreatedAtDesc();
    }
    public interface SuggestionRepo extends JpaRepository<Suggestion, Long> {
        List<Suggestion> findByUserIdOrderByCreatedAtDesc(Integer userId);
        List<Suggestion> findByShowPublicTrueAndStatus(SuggestionStatus status);
        List<Suggestion> findAllByOrderByCreatedAtDesc();
    }
    public interface FavouriteRepo extends JpaRepository<Favourite, Long> {
        List<Favourite> findByUserId(Integer userId);
        Optional<Favourite> findByUserIdAndProductId(Integer userId, Long productId);
    }
    public interface StoryRepo extends JpaRepository<StoryBeat, Long> {
        List<StoryBeat> findAllByOrderBySortOrderAsc();
    }
}
