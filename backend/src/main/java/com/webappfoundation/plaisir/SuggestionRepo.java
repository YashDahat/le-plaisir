package com.webappfoundation.plaisir;

import com.webappfoundation.plaisir.PlaisirModel.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SuggestionRepo extends JpaRepository<Suggestion, Long> {
    List<Suggestion> findByUserIdOrderByCreatedAtDesc(Integer userId);
    List<Suggestion> findByShowPublicTrueAndStatus(SuggestionStatus status);
    List<Suggestion> findAllByOrderByCreatedAtDesc();
}
