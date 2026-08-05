CREATE TABLE `workspace_user_states` (
  `workspace_key` text PRIMARY KEY NOT NULL,
  `payload` text NOT NULL,
  `version` integer DEFAULT 1 NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `api_rate_limits` (
  `rate_key` text PRIMARY KEY NOT NULL,
  `window_start` integer NOT NULL,
  `count` integer NOT NULL
);
