package com.example.auth.repository;

import com.example.auth.entity.FavoriteItem;
import com.example.auth.entity.User;
import com.example.auth.entity.Item;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FavoriteItemRepository extends JpaRepository<FavoriteItem, Long> {
    List<FavoriteItem> findByUser(User user);
    Optional<FavoriteItem> findByUserAndItem(User user, Item item);
}