package com.doo.api.controller;

import com.doo.api.service.AuthService;
import com.doo.api.service.AuthService.User;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public static final String COOKIE = "SESSION";

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    public record Credentials(String username, String password) {
    }

    public record Me(String username) {
    }

    @PostMapping("/signup")
    public ResponseEntity<Me> signup(@RequestBody Credentials c) {
        long id = auth.signup(c.username(), c.password());
        return withSession(id, c.username());
    }

    @PostMapping("/login")
    public ResponseEntity<Me> login(@RequestBody Credentials c) {
        long id = auth.authenticate(c.username(), c.password());
        return withSession(id, c.username());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue(name = COOKIE, required = false) String token) {
        auth.deleteSession(token);
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString()).build();
    }

    @GetMapping("/me")
    public Me me(@CookieValue(name = COOKIE, required = false) String token) {
        User u = auth.findUser(token).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."));
        return new Me(u.username());
    }

    private ResponseEntity<Me> withSession(long userId, String username) {
        String token = auth.createSession(userId);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie(token, Duration.ofDays(AuthService.SESSION_DAYS)).toString())
                .body(new Me(username));
    }

    private static ResponseCookie cookie(String value, Duration maxAge) {
        return ResponseCookie.from(COOKIE, value).httpOnly(true).sameSite("Lax").path("/").maxAge(maxAge).build();
    }
}
