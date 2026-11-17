package com.webappfoundation.plaisir;

import com.webappfoundation.plaisir.PlaisirModel.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PickupDetailRepo extends JpaRepository<PickupDetail, Long> {
    Optional<PickupDetail> findByOrderId(Long orderId);
    List<PickupDetail> findByOrderIdIn(Collection<Long> ids);
    long countByPickupAt(LocalDateTime pickupAt);
}
