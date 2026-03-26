package com.example.auth.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {
    @GetMapping({"/", "/login", "/register", "/profile"})
    public String index() {
        return "forward:/index.html";
    }
}
