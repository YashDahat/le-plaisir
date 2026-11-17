package com.webappfoundation.plaisir;

import com.webappfoundation.plaisir.PlaisirModel.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface FlavourRepo extends JpaRepository<MacaronFlavour, Long> {
    List<MacaronFlavour> findByAvailableTrueOrderBySortOrderAsc();
    Optional<MacaronFlavour> findByNameIgnoreCase(String name);
}
