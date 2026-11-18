import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.*;
import java.net.InetSocketAddress;
import java.net.BindException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.concurrent.Executors;

/**
 * ============================================================================
 * Chicken Run — Temple Run Edition (Core Java Backend)
 * ----------------------------------------------------------------------------
 * Technology: Pure Core Java (Standard Library Only)
 * Database:   In-Memory Java Array (No external database, no Spring Boot)
 * HTTP Engine: com.sun.net.httpserver.HttpServer
 * ============================================================================
 */
public class Main {
    private static int activePort = 8080;

    // ========================================================================
    // DATABASE SIMULATION: PURE JAVA ARRAY STORAGE
    // ========================================================================
    // Requirements: "database only array"
    // We use a fixed-size array of ScoreRecord objects with insertion-sort logic.
    // ========================================================================
    private static final int MAX_CAPACITY = 50;
    private static final ScoreRecord[] scoreDatabase = new ScoreRecord[MAX_CAPACITY];
    private static int totalRecords = 0;
    private static final Object DB_LOCK = new Object();

    /**
     * Record representing a single player score entry stored in the array.
     */
    static class ScoreRecord {
        String player;
        int score;
        int coins;
        long timestamp;
        String dateString;

        ScoreRecord(String player, int score, int coins, long timestamp) {
            this.player = player;
            this.score = score;
            this.coins = coins;
            this.timestamp = timestamp;
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm");
            this.dateString = sdf.format(new Date(timestamp));
        }
    }

    public static void main(String[] args) {
        int desiredPort = 8080;
        if (args.length > 0) {
            try {
                desiredPort = Integer.parseInt(args[0]);
            } catch (Exception e) {
                System.out.println("Invalid port argument, defaulting to " + desiredPort);
            }
        }

        // Seed initial records into the Java array
        seedInitialScores();

        HttpServer server = null;
        for (int p = desiredPort; p <= desiredPort + 10; p++) {
            try {
                server = HttpServer.create(new InetSocketAddress(p), 0);
                activePort = p;
                break;
            } catch (BindException be) {
                System.out.println("Port " + p + " is occupied, trying next port...");
            } catch (IOException e) {
                System.err.println("Error initializing server on port " + p + ": " + e.getMessage());
            }
        }

        if (server == null) {
            System.err.println("Fatal: Could not bind server to any port between " + desiredPort + " and " + (desiredPort + 10));
            return;
        }

        try {
            // API Routes
            server.createContext("/api/health", new HealthHandler());
            server.createContext("/api/leaderboard", new LeaderboardHandler());
            server.createContext("/api/score", new ScoreHandler());
            server.createContext("/api/reset", new ResetHandler());

            // Static File Route (Serves HTML, CSS, JS frontend on http://localhost:<port>/)
            server.createContext("/", new StaticFileHandler());

            // Use a multi-threaded executor for handling concurrent requests
            server.setExecutor(Executors.newFixedThreadPool(8));
            server.start();

            System.out.println("===============================================================");
            System.out.println("   CHICKEN RUN -- TEMPLE RUN EDITION (CORE JAVA BACKEND)");
            System.out.println("===============================================================");
            System.out.println(" [✓] Server running at: http://localhost:" + activePort);
            System.out.println(" [✓] Web Game playable at: http://localhost:" + activePort + "/");
            File fDir = new StaticFileHandler().resolveFrontendDirectory();
            System.out.println(" [✓] Frontend Root: " + fDir.getAbsolutePath());
            System.out.println(" [✓] Storage Engine: Pure Core Java Array (Capacity: " + MAX_CAPACITY + ")");
            System.out.println(" [✓] Available API Endpoints:");
            System.out.println("      - GET  /api/health      -> Server health check");
            System.out.println("      - GET  /api/leaderboard -> Top scores from Java array");
            System.out.println("      - POST /api/score       -> Submit player score");
            System.out.println("      - POST /api/reset       -> Reset array to default scores");
            System.out.println("===============================================================");
        } catch (Exception e) {
            System.err.println("Fatal Error starting server: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Pre-seeds the array database with sample temple runner scores.
     */
    private static void seedInitialScores() {
        synchronized (DB_LOCK) {
            totalRecords = 0;
            long now = System.currentTimeMillis();
            insertScoreRecord("TempleKing", 15420, 68, now - 3600000 * 5);
            insertScoreRecord("FeatherDash", 12150, 52, now - 3600000 * 12);
            insertScoreRecord("GoldenCluck", 9870, 39, now - 3600000 * 24);
            insertScoreRecord("EggScaper", 7640, 28, now - 3600000 * 48);
            insertScoreRecord("SpeedyHen", 5320, 17, now - 3600000 * 72);
        }
    }

    /**
     * Inserts a record into the array maintaining descending order of scores.
     * Demonstrates classic array shifting and insertion sort.
     * @return 1-based rank position or -1 if score didn't make the array.
     */
    private static int insertScoreRecord(String player, int score, int coins, long timestamp) {
        // Find position to insert (descending score order)
        int insertPos = totalRecords;
        for (int i = 0; i < totalRecords; i++) {
            if (score > scoreDatabase[i].score) {
                insertPos = i;
                break;
            }
        }

        // If array is full and new score is less than the lowest score, reject
        if (insertPos >= MAX_CAPACITY) {
            return -1;
        }

        // Shift elements right by one position to make room for new record
        int lastIndex = Math.min(totalRecords, MAX_CAPACITY - 1);
        for (int i = lastIndex; i > insertPos; i--) {
            scoreDatabase[i] = scoreDatabase[i - 1];
        }

        // Insert new record at target index in the array
        scoreDatabase[insertPos] = new ScoreRecord(player, score, coins, timestamp);

        if (totalRecords < MAX_CAPACITY) {
            totalRecords++;
        }

        return insertPos + 1; // 1-based rank
    }
    

    /**
     * Builds a JSON string representing the leaderboard array.
     */
    private static String getLeaderboardJson() {
        StringBuilder json = new StringBuilder();
        json.append("{\"success\":true,\"count\":").append(totalRecords).append(",\"scores\":[");

        for (int i = 0; i < totalRecords; i++) {
            ScoreRecord r = scoreDatabase[i];
            if (i > 0) json.append(",");
            json.append("{")
                .append("\"rank\":").append(i + 1).append(",")
                .append("\"player\":\"").append(escapeJson(r.player)).append("\",")
                .append("\"score\":").append(r.score).append(",")
                .append("\"coins\":").append(r.coins).append(",")
                .append("\"date\":\"").append(r.dateString).append("\"")
                .append("}");
        }

        json.append("]}");
        return json.toString();
    }

    // ========================================================================
    // HTTP HANDLERS
    // ========================================================================

    /**
     * Health check endpoint: GET /api/health
     */
    static class HealthHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendResponse(exchange, 204, "");
                return;
            }
            if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendResponse(exchange, 405, "{\"error\":\"Method not allowed\"}");
                return;
            }

            int count;
            synchronized (DB_LOCK) {
                count = totalRecords;
            }

            String json = "{"
                    + "\"status\":\"UP\","
                    + "\"service\":\"Chicken Run Temple API\","
                    + "\"port\":" + activePort + ","
                    + "\"backend\":\"Core Java (com.sun.net.httpserver)\","
                    + "\"database\":\"Pure Java Array Storage\","
                    + "\"arrayCapacity\":" + MAX_CAPACITY + ","
                    + "\"storedRecords\":" + count + ","
                    + "\"timestamp\":" + System.currentTimeMillis()
                    + "}";

            sendResponse(exchange, 200, json);
        }
    }

    /**
     * Leaderboard endpoint: GET /api/leaderboard
     */
    static class LeaderboardHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendResponse(exchange, 204, "");
                return;
            }
            if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendResponse(exchange, 405, "{\"error\":\"Method not allowed\"}");
                return;
            }

            String response;
            synchronized (DB_LOCK) {
                response = getLeaderboardJson();
            }
            sendResponse(exchange, 200, response);
        }
    }

    /**
     * Submit score endpoint: POST /api/score
     */
    static class ScoreHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendResponse(exchange, 204, "");
                return;
            }
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendResponse(exchange, 405, "{\"error\":\"Method not allowed\"}");
                return;
            }

            // Read request body
            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);

            String player = extractString(body, "player", "Runner").trim();
            if (player.isEmpty()) player = "Runner";
            if (player.length() > 20) player = player.substring(0, 20);

            int score = Math.max(0, Math.min(100_000_000, extractInt(body, "score", 0)));
            int coins = Math.max(0, Math.min(100_000_000, extractInt(body, "coins", 0)));

            int rank;
            String leaderboardJson;
            synchronized (DB_LOCK) {
                rank = insertScoreRecord(player, score, coins, System.currentTimeMillis());
                leaderboardJson = getLeaderboardJson();
            }

            String json = "{"
                    + "\"saved\":true,"
                    + "\"rank\":" + rank + ","
                    + "\"player\":\"" + escapeJson(player) + "\","
                    + "\"score\":" + score + ","
                    + "\"coins\":" + coins + ","
                    + "\"leaderboard\":" + leaderboardJson
                    + "}";

            sendResponse(exchange, 200, json);
        }
    }

    /**
     * Reset array endpoint: POST /api/reset
     */
    static class ResetHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendResponse(exchange, 204, "");
                return;
            }
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendResponse(exchange, 405, "{\"error\":\"Method not allowed\"}");
                return;
            }

            seedInitialScores();
            String response;
            synchronized (DB_LOCK) {
                response = "{\"reset\":true,\"leaderboard\":" + getLeaderboardJson() + "}";
            }
            sendResponse(exchange, 200, response);
        }
    }

    /**
     * Static file handler to serve frontend (index.html, style.css, game.js)
     * allows directly opening http://localhost:<port> to play!
     */
    static class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendResponse(exchange, 204, "");
                return;
            }

            String path = exchange.getRequestURI().getPath();
            if (path.equals("/") || path.isEmpty()) {
                path = "/index.html";
            }

            // Find frontend directory in common locations
            File frontendDir = resolveFrontendDirectory();
            File requestedFile = new File(frontendDir, path.replace('/', File.separatorChar));

            // Prevent path traversal
            if (!requestedFile.getCanonicalPath().startsWith(frontendDir.getCanonicalPath()) || !requestedFile.exists() || requestedFile.isDirectory()) {
                String notFound = "<html><body><h1>404 Not Found</h1><p>File " + escapeJson(path) + " not found.</p></body></html>";
                exchange.getResponseHeaders().set("Content-Type", "text/html; charset=utf-8");
                byte[] bytes = notFound.getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(404, bytes.length);
                try (OutputStream os = exchange.getResponseBody()) { os.write(bytes); }
                return;
            }

            // Determine content type
            String contentType = "text/plain";
            String lower = requestedFile.getName().toLowerCase();
            if (lower.endsWith(".html")) contentType = "text/html; charset=utf-8";
            else if (lower.endsWith(".css")) contentType = "text/css; charset=utf-8";
            else if (lower.endsWith(".js")) contentType = "application/javascript; charset=utf-8";
            else if (lower.endsWith(".json")) contentType = "application/json; charset=utf-8";
            else if (lower.endsWith(".png")) contentType = "image/png";
            else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) contentType = "image/jpeg";
            else if (lower.endsWith(".svg")) contentType = "image/svg+xml";
            else if (lower.endsWith(".ico")) contentType = "image/x-icon";

            exchange.getResponseHeaders().set("Content-Type", contentType);
            byte[] fileBytes = Files.readAllBytes(requestedFile.toPath());
            exchange.sendResponseHeaders(200, fileBytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(fileBytes);
                os.flush();
            } finally {
                exchange.close();
            }
        }

        private File resolveFrontendDirectory() {
            // 1. Try resolving relative to code location (JAR or class directory)
            try {
                File codeLocation = new File(Main.class.getProtectionDomain().getCodeSource().getLocation().toURI());
                File dir = codeLocation.isDirectory() ? codeLocation : codeLocation.getParentFile();
                // If in backend/bin or backend/src, go up to project root
                while (dir != null) {
                    File candidate = new File(dir, "frontend");
                    if (candidate.exists() && candidate.isDirectory()) {
                        return candidate;
                    }
                    dir = dir.getParentFile();
                }
            } catch (Exception ignored) {}

            // 2. Try candidate relative and absolute paths
            String[] candidatePaths = {
                "frontend",
                "../frontend",
                "../../frontend",
                "chicken-run-temple/frontend",
                "scratch/chicken-run-temple/frontend",
                "C:/Users/saman/.gemini/antigravity/scratch/chicken-run-temple/frontend",
                "c:/Users/saman/Downloads/chicken-run-temple-project/chicken-run-temple/frontend"
            };
            for (String p : candidatePaths) {
                File dir = new File(p);
                if (dir.exists() && dir.isDirectory()) {
                    return dir;
                }
            }
            return new File("frontend");
        }
    }

    // ========================================================================
    // UTILITY METHODS: JSON PARSING, CORS & HTTP RESPONSES
    // ========================================================================

    private static void addCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    private static void sendResponse(HttpExchange exchange, int status, String body) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, status == 204 ? -1 : bytes.length);
        if (status != 204) {
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        } else {
            exchange.close();
        }
    }

    private static String extractString(String json, String key, String defaultValue) {
        if (json == null) return defaultValue;
        String pattern = "\"" + key + "\"";
        int idx = json.indexOf(pattern);
        if (idx < 0) return defaultValue;
        idx = json.indexOf(':', idx);
        if (idx < 0) return defaultValue;
        idx++;
        while (idx < json.length() && Character.isWhitespace(json.charAt(idx))) idx++;
        if (idx >= json.length() || json.charAt(idx) != '"') return defaultValue;
        int end = json.indexOf('"', idx + 1);
        if (end < 0) return defaultValue;
        return json.substring(idx + 1, end).replace("\\\"", "\"");
    }

    private static int extractInt(String json, String key, int defaultValue) {
        if (json == null) return defaultValue;
        String pattern = "\"" + key + "\"";
        int idx = json.indexOf(pattern);
        if (idx < 0) return defaultValue;
        idx = json.indexOf(':', idx);
        if (idx < 0) return defaultValue;
        idx++;
        while (idx < json.length() && Character.isWhitespace(json.charAt(idx))) idx++;
        int end = idx;
        if (end < json.length() && (json.charAt(end) == '-' || json.charAt(end) == '+')) end++;
        while (end < json.length() && Character.isDigit(json.charAt(end))) end++;
        if (end == idx) return defaultValue;
        try {
            return Integer.parseInt(json.substring(idx, end));
        } catch (Exception e) {
            return defaultValue;
        }
    }

    private static String escapeJson(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\")
                  .replace("\"", "\\\"")
                  .replace("\b", "\\b")
                  .replace("\f", "\\f")
                  .replace("\n", "\\n")
                  .replace("\r", "\\r")
                  .replace("\t", "\\t");
    }
}
