package com.doo.api.controller;

import com.doo.api.service.AuthService;
import com.doo.api.service.GameService;
import com.doo.api.service.GameService.State;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class GameApiController {

    private final GameService service;
    private final AuthService auth;

    public GameApiController(GameService service, AuthService auth) {
        this.service = service;
        this.auth = auth;
    }

    public record ResultRequest(String game, String outcome, int delta) {
    }

    @GetMapping("/state")
    public State state(@CookieValue(name = AuthController.COOKIE, required = false) String token) {
        return service.state(userId(token));
    }

    @PostMapping("/result")
    public State result(@CookieValue(name = AuthController.COOKIE, required = false) String token,
                        @RequestBody ResultRequest req) {
        long userId = userId(token);
        try {
            return service.record(userId, req.game(), req.outcome(), req.delta());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @PostMapping("/reset")
    public State reset(@CookieValue(name = AuthController.COOKIE, required = false) String token) {
        return service.reset(userId(token));
    }

    private long userId(String token) {
        return auth.findUser(token).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.")).id();
    }
}
