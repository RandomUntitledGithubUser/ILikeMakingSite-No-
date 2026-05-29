package com.example.auth.controller;

import com.example.auth.entity.*;
import com.example.auth.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class StoreController {

    @Autowired private ItemRepository itemRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private CartItemRepository cartItemRepository;
    @Autowired private FavoriteItemRepository favoriteItemRepository;

    private User getAuthUser(Principal principal) {
        if (principal == null) throw new RuntimeException("Unauthorized");
        return userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private void verifyAdmin(User user) {
        if (!user.isAdmin()) throw new RuntimeException("Access denied: Not an admin");
    }

    // --- USER PROFILE & CONFIG ---
    @GetMapping("/users/me")
    public ResponseEntity<?> getCurrentUser(Principal principal) {
        if (principal == null) return ResponseEntity.ok(Map.of("authenticated", false));
        User user = getAuthUser(principal);
        return ResponseEntity.ok(Map.of(
            "authenticated", true,
            "username", user.getUsername(),
            "email", user.getEmail(),
            "isAdmin", user.isAdmin()
        ));
    }

    // --- CATALOGUE ---
    @GetMapping("/items/recent")
		public List<Item> getRecentItems() {
				return itemRepository.findTop5ByOrderByCreatedAtDesc();
		}

    @GetMapping("/items")
    public Page<Item> getCatalogue(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "") String search) {
        
        Sort sort = direction.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        if (category != null && !category.isEmpty() && !category.equalsIgnoreCase("all")) {
            return itemRepository.findByItemCategoryAndItemNameContainingIgnoreCase(category, search, pageable);
        }
        return itemRepository.findByItemNameContainingIgnoreCase(search, pageable);
    }

    @GetMapping("/items/{id}")
    public ResponseEntity<Item> getItemById(@PathVariable Long id) {
        return itemRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // --- CART ---
    @GetMapping("/cart")
    public List<CartItem> getCart(Principal principal) {
        return cartItemRepository.findByUser(getAuthUser(principal));
    }

    @PostMapping("/cart/add/{itemId}")
    public ResponseEntity<?> addToCart(@PathVariable Long itemId, Principal principal) {
        User user = getAuthUser(principal);
        Item item = itemRepository.findById(itemId).orElseThrow();
        CartItem cartItem = cartItemRepository.findByUserAndItem(user, item)
                .orElse(new CartItem());
        
        if (cartItem.getId() != null) {
            cartItem.setQuantity(cartItem.getQuantity() + 1);
        } else {
            cartItem.setUser(user);
            cartItem.setItem(item);
            cartItem.setQuantity(1);
        }
        cartItemRepository.save(cartItem);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PutMapping("/cart/quantity/{cartItemId}")
    public ResponseEntity<?> updateQuantity(@PathVariable Long cartItemId, @RequestParam int quantity, Principal principal) {
        CartItem cartItem = cartItemRepository.findById(cartItemId).orElseThrow();
        if (!cartItem.getUser().getId().equals(getAuthUser(principal).getId())) {
            return ResponseEntity.status(403).build();
        }
        if (quantity <= 0) {
            cartItemRepository.delete(cartItem);
        } else {
            cartItem.setQuantity(quantity);
            cartItemRepository.save(cartItem);
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    @DeleteMapping("/cart/remove/{cartItemId}")
    public ResponseEntity<?> removeFromCart(@PathVariable Long cartItemId, Principal principal) {
        CartItem cartItem = cartItemRepository.findById(cartItemId).orElseThrow();
        if (!cartItem.getUser().getId().equals(getAuthUser(principal).getId())) {
            return ResponseEntity.status(403).build();
        }
        cartItemRepository.delete(cartItem);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // --- FAVORITES ---
    @GetMapping("/favorites")
    public List<FavoriteItem> getFavorites(Principal principal) {
        return favoriteItemRepository.findByUser(getAuthUser(principal));
    }


    @PostMapping("/favorites/toggle/{itemId}")
    public ResponseEntity<?> toggleFavorite(@PathVariable Long itemId, Principal principal) {
        User user = getAuthUser(principal);
        Item item = itemRepository.findById(itemId).orElseThrow();
        var favOpt = favoriteItemRepository.findByUserAndItem(user, item);
        
        if (favOpt.isPresent()) {
            favoriteItemRepository.delete(favOpt.get());
            return ResponseEntity.ok(Map.of("added", false));
        } else {
            FavoriteItem fav = new FavoriteItem();
            fav.setUser(user);
            fav.setItem(item);
            favoriteItemRepository.save(fav);
            return ResponseEntity.ok(Map.of("added", true));
        }
    }

    // --- ADMIN: ITEMS ---
    @GetMapping("/admin/items")
    public List<Item> adminGetItems(Principal principal) {
        verifyAdmin(getAuthUser(principal));
        return itemRepository.findAll();
    }

    @PostMapping("/admin/items")
    public Item adminCreateItem(@RequestBody Item item, Principal principal) {
        verifyAdmin(getAuthUser(principal));
        return itemRepository.save(item);
    }

    @PutMapping("/admin/items/{id}")
    public Item adminUpdateItem(@PathVariable Long id, @RequestBody Item updated, Principal principal) {
        verifyAdmin(getAuthUser(principal));
        Item existing = itemRepository.findById(id).orElseThrow();
        existing.setItemName(updated.getItemName());
        existing.setItemDesc(updated.getItemDesc());
        existing.setItemPrice(updated.getItemPrice());
        existing.setItemCategory(updated.getItemCategory());
        existing.setItemImageUrl(updated.getItemImageUrl());
        return itemRepository.save(existing);
    }

    @DeleteMapping("/admin/items/{id}")
    public ResponseEntity<?> adminDeleteItem(@PathVariable Long id, Principal principal) {
        verifyAdmin(getAuthUser(principal));
        itemRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // --- ADMIN: USERS ---
    @GetMapping("/admin/users")
    public List<User> adminGetUsers(Principal principal) {
        verifyAdmin(getAuthUser(principal));
        return userRepository.findAll();
    }

    @PutMapping("/admin/users/{id}")
    public User adminUpdateUser(@PathVariable Long id, @RequestBody Map<String, Object> updates, Principal principal) {
        verifyAdmin(getAuthUser(principal));
        User user = userRepository.findById(id).orElseThrow();
        if (updates.containsKey("username")) user.setUsername((String) updates.get("username"));
        if (updates.containsKey("email")) user.setEmail((String) updates.get("email"));
        if (updates.containsKey("admin")) user.setAdmin((Boolean) updates.get("admin"));
        return userRepository.save(user);
    }

    @DeleteMapping("/admin/users/{id}")
    public ResponseEntity<?> adminDeleteUser(@PathVariable Long id, Principal principal) {
        verifyAdmin(getAuthUser(principal));
        userRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true));
    }
}