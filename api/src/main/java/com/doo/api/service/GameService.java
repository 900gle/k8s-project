package com.doo.api.service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GameService {

    static final int START_POINTS = 1000;
    static final Set<String> GAMES = Set.of("horse", "ladder", "oddeven", "rps");

    public record Stat(int w, int l, int d, int net) {
    }

    public record State(int points, Map<String, Stat> stats) {
    }

    private final JdbcClient jdbc;

    public GameService(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public State state() {
        int points = jdbc.sql("SELECT points FROM wallet WHERE id = 1").query(Integer.class).single();
        Map<String, Stat> stats = new LinkedHashMap<>();
        jdbc.sql("SELECT game, wins, losses, draws, net FROM game_stat").query(rs -> {
            stats.put(rs.getString("game"),
                    new Stat(rs.getInt("wins"), rs.getInt("losses"), rs.getInt("draws"), rs.getInt("net")));
        });
        return new State(points, stats);
    }

    /** 게임 결과 1건을 반영한다. outcome: w(승) / l(패) / d(무). 손실은 보유 포인트를 넘을 수 없다. */
    @Transactional
    public State record(String game, String outcome, int delta) {
        if (game == null || !GAMES.contains(game)) {
            throw new IllegalArgumentException("unknown game: " + game);
        }
        if (!"w".equals(outcome) && !"l".equals(outcome) && !"d".equals(outcome)) {
            throw new IllegalArgumentException("unknown outcome: " + outcome);
        }
        if (("w".equals(outcome) && delta <= 0) || ("l".equals(outcome) && delta >= 0)
                || ("d".equals(outcome) && delta != 0)) {
            throw new IllegalArgumentException("delta does not match outcome");
        }
        int points = jdbc.sql("SELECT points FROM wallet WHERE id = 1 FOR UPDATE").query(Integer.class).single();
        if (points + delta < 0) {
            throw new IllegalArgumentException("insufficient points");
        }
        jdbc.sql("UPDATE wallet SET points = points + :delta WHERE id = 1").param("delta", delta).update();
        jdbc.sql("""
                INSERT INTO game_stat (game, wins, losses, draws, net)
                VALUES (:game, :w, :l, :d, :delta)
                ON DUPLICATE KEY UPDATE wins = wins + :w, losses = losses + :l, draws = draws + :d, net = net + :delta
                """)
                .param("game", game)
                .param("w", "w".equals(outcome) ? 1 : 0)
                .param("l", "l".equals(outcome) ? 1 : 0)
                .param("d", "d".equals(outcome) ? 1 : 0)
                .param("delta", delta)
                .update();
        jdbc.sql("INSERT INTO game_log (game, outcome, delta) VALUES (:game, :outcome, :delta)")
                .param("game", game).param("outcome", outcome).param("delta", delta).update();
        return state();
    }

    @Transactional
    public State reset() {
        jdbc.sql("UPDATE wallet SET points = :p WHERE id = 1").param("p", START_POINTS).update();
        jdbc.sql("DELETE FROM game_stat").update();
        return state();
    }
}
