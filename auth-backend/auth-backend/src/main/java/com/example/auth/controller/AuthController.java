package com.example.auth.controller;

import com.example.auth.dto.LoginRequest;
import com.example.auth.dto.RegisterRequest;
import com.example.auth.dto.ForgotPasswordRequest;
import com.example.auth.dto.ResetPasswordRequest;
import com.example.auth.entity.User;
import com.example.auth.repository.UserRepository;
import com.example.auth.security.JwtUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JavaMailSender mailSender;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        try {
            if (req.getUsername() == null || req.getUsername().trim().length() < 3) {
                return ResponseEntity.ok(Map.of("success", false, "message", "Имя пользователя должно быть не менее 3 символов"));
            }
            if (req.getEmail() == null || !req.getEmail().contains("@")) {
                return ResponseEntity.ok(Map.of("success", false, "message", "Некорректный формат Email"));
            }
            if (req.getPassword() == null || req.getPassword().length() < 6) {
                return ResponseEntity.ok(Map.of("success", false, "message", "Пароль должен быть не менее 6 символов"));
            }
            if (userRepository.findByUsername(req.getUsername()).isPresent()) {
                return ResponseEntity.ok(Map.of("success", false, "message", "Это имя пользователя уже занято"));
            }
            if (userRepository.findByEmail(req.getEmail()).isPresent()) {
                return ResponseEntity.ok(Map.of("success", false, "message", "Пользователь с таким Email уже существует"));
            }

            User user = new User();
            user.setUsername(req.getUsername());
            user.setEmail(req.getEmail());
            user.setPassword(passwordEncoder.encode(req.getPassword()));
            userRepository.save(user);

            return ResponseEntity.ok(Map.of("success", true, "message", "Регистрация прошла успешно"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", "Ошибка: " + e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        return userRepository.findByEmailOrUsername(req.getEmailOrUsername(), req.getEmailOrUsername())
                .filter(user -> passwordEncoder.matches(req.getPassword(), user.getPassword()))
                .map(user -> {
                    String token = jwtUtils.generateToken(user.getUsername());
                    return ResponseEntity.ok(Map.of("success", true, "token", token));
                })
                .orElse(ResponseEntity.ok(Map.of("success", false, "message", "Неверный логин или пароль")));
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@RequestHeader("Authorization") String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).build();
        }

        String token = authHeader.replace("Bearer ", "");
        if (jwtUtils.validateToken(token)) {
            String username = jwtUtils.getUsernameFromToken(token);
            return userRepository.findByUsername(username)
                    .map(user -> ResponseEntity.ok(Map.of(
                            "username", user.getUsername(),
                            "email", user.getEmail(),
                            "createdAt", user.getCreatedAt().toString(),
                            "isAdmin", user.isAdmin()
                    )))
                    .orElse(ResponseEntity.status(404).build());
        }
        return ResponseEntity.status(401).build();
    }

		@PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        String email = request.getEmail();
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of("success", false, "message", "Пользователь с таким Email не найден"));
        }

        User user = userOpt.get();
        
        // Генерируем случайный 6-значный цифровой код вместо UUID
        String code = String.format("%06d", new java.util.Random().nextInt(900000) + 100000);
        
        user.setResetToken(code);
        user.setResetTokenExpiry(LocalDateTime.now().plusMinutes(15)); // Код действителен 15 минут
        userRepository.save(user);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("dfgertg5@gmail.com");
            message.setTo(user.getEmail());
            message.setSubject("Код восстановления пароля");
            message.setText("Здравствуйте!\n\nВаш код для восстановления пароля: " + code + 
                            "\n\nВведите этот код на странице сброса пароля сайта. Код действует 15 минут.");
            mailSender.send(message);

            return ResponseEntity.ok(Map.of("success", true, "message", "Код восстановления успешно отправлен на Email"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", "Не удалось отправить письмо. Ошибка: " + e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
        String token = request.getToken(); // Сюда теперь будет приходить 6-значный код
        String newPassword = request.getPassword();

        if (token == null || newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.ok(Map.of("success", false, "message", "Некорректные данные или пароль слишком короткий"));
        }

        Optional<User> userOpt = userRepository.findByResetToken(token);

        if (userOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of("success", false, "message", "Неверный или недействительный код восстановления"));
        }

        User user = userOpt.get();
        if (user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            return ResponseEntity.ok(Map.of("success", false, "message", "Срок действия кода безопасности истек"));
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("success", true, "message", "Пароль успешно обновлен"));
    }
}