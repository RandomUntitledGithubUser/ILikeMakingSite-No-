package com.example.auth.repository;

import com.example.auth.entity.CartItem;
import com.example.auth.entity.User;
import com.example.auth.entity.Item;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    List<CartItem> findByUser(User user);
    Optional<CartItem> findByUserAndItem(User user, Item item);
}