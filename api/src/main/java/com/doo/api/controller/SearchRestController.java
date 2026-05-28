package com.doo.api.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SearchRestController {


    @GetMapping("/")
    public String getHome(){
        return "HOME";
    }
}
