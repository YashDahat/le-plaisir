package com.webappfoundation.plaisir;

import com.webappfoundation.plaisir.PlaisirModel.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DishInfoRepo extends JpaRepository<DishInfo, Long> {
    Optional<DishInfo> findByProductId(Long productId);
    List<DishInfo> findByProductIdIn(Collection<Long> ids);
    List<DishInfo> findByInVitrineTodayTrue();
}
