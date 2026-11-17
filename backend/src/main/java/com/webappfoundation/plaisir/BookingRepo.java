package com.webappfoundation.plaisir;

import com.webappfoundation.plaisir.PlaisirModel.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BookingRepo extends JpaRepository<BookingDetail, Long> {
    Optional<BookingDetail> findByOrderId(Long orderId);
    List<BookingDetail> findByDateAndSlotStart(LocalDate date, LocalTime slotStart);
    List<BookingDetail> findByDate(LocalDate date);
    List<BookingDetail> findByUserIdOrderByDateDesc(Integer userId);
    List<BookingDetail> findByDateBetweenOrderByDateAscSlotStartAsc(LocalDate from, LocalDate to);
}
