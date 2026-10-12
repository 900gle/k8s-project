package com.doo.api.controller;

import com.doo.api.service.GameService;
import com.doo.api.service.GameService.State;
import org.springframework.http.HttpStatus;
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

    public GameApiController(GameService service) {
        this.service = service;
    }

    public record ResultRequest(String game, String outcome, int delta) {
    }

    @GetMapping("/state")
    public State state() {
        return service.state();
    }

    @PostMapping("/result")
    public State result(@RequestBody ResultRequest req) {
        try {
            return service.record(req.game(), req.outcome(), req.delta());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @PostMapping("/reset")
    public State reset() {
        return service.reset();
    }
}
