package com.example.auth.repository;

import com.example.auth.entity.Item;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ItemRepository extends JpaRepository<Item, Long> {
    List<Item> findTop5ByOrderByCreatedAtDesc();
    Page<Item> findByItemNameContainingIgnoreCase(String name, Pageable pageable);
    Page<Item> findByItemCategoryAndItemNameContainingIgnoreCase(String category, String name, Pageable pageable);
}