package com.doo.api.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class GameController {

    @GetMapping("/login")
    public String login() {
        return "forward:/login.html";
    }

    @GetMapping("/horse")
    public String horse() {
        return "forward:/games/horse.html";
    }

    @GetMapping("/ladder")
    public String ladder() {
        return "forward:/games/ladder.html";
    }

    @GetMapping("/oddeven")
    public String oddeven() {
        return "forward:/games/oddeven.html";
    }

    @GetMapping("/rps")
    public String rps() {
        return "forward:/games/rps.html";
    }
}
