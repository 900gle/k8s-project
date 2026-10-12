package com.doo.api.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    public static final int SESSION_DAYS = 7;
    static final Pattern USERNAME = Pattern.compile("^[A-Za-z0-9_가-힣]{3,20}$");

    public record User(long id, String username) {
    }

    private final JdbcClient jdbc;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final SecureRandom random = new SecureRandom();
    // 없는 아이디로 로그인해도 응답 시간이 비슷하도록 비교용으로 쓰는 해시
    private final String dummyHash = encoder.encode("dummy-password");

    public AuthService(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** 가입하고 시작 포인트 지갑을 만든다. 반환값은 새 사용자 id. */
    @Transactional
    public long signup(String username, String password) {
        if (username == null || !USERNAME.matcher(username).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "아이디는 3~20자의 한글, 영문, 숫자, _ 만 사용할 수 있습니다.");
        }
        // BCrypt는 72바이트까지만 사용한다
        if (password == null || password.length() < 6 || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호는 6자 이상, 72바이트 이하로 입력하세요.");
        }
        var keys = new GeneratedKeyHolder();
        try {
            jdbc.sql("INSERT INTO users (username, password_hash) VALUES (:u, :h)")
                    .param("u", username).param("h", encoder.encode(password)).update(keys);
        } catch (DuplicateKeyException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 아이디입니다.");
        }
        long id = keys.getKey().longValue();
        jdbc.sql("INSERT INTO wallet (user_id, points) VALUES (:id, :p)")
                .param("id", id).param("p", GameService.START_POINTS).update();
        return id;
    }

    /** 아이디/비밀번호 검증. 실패 사유는 구분하지 않는다. */
    public long authenticate(String username, String password) {
        Optional<Row> row = jdbc.sql("SELECT id, password_hash FROM users WHERE username = :u")
                .param("u", username == null ? "" : username)
                .query((rs, n) -> new Row(rs.getLong("id"), rs.getString("password_hash"))).optional();
        boolean ok = encoder.matches(password == null ? "" : password, row.map(Row::hash).orElse(dummyHash));
        if (row.isEmpty() || !ok) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다.");
        }
        return row.get().id();
    }

    private record Row(long id, String hash) {
    }

    /** 세션을 만들고 쿠키에 담을 원본 토큰을 돌려준다. DB에는 해시만 저장한다. */
    public String createSession(long userId) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        jdbc.sql("DELETE FROM user_session WHERE expires_at < NOW()").update();
        jdbc.sql("INSERT INTO user_session (token_hash, user_id, expires_at) VALUES (:h, :id, DATE_ADD(NOW(), INTERVAL :d DAY))")
                .param("h", hash(token)).param("id", userId).param("d", SESSION_DAYS).update();
        return token;
    }

    public Optional<User> findUser(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        return jdbc.sql("""
                SELECT u.id, u.username FROM user_session s JOIN users u ON u.id = s.user_id
                WHERE s.token_hash = :h AND s.expires_at > NOW()
                """).param("h", hash(token))
                .query((rs, n) -> new User(rs.getLong("id"), rs.getString("username"))).optional();
    }

    public void deleteSession(String token) {
        if (token != null) {
            jdbc.sql("DELETE FROM user_session WHERE token_hash = :h").param("h", hash(token)).update();
        }
    }

    private static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
