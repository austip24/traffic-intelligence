CREATE TABLE "area_population" (
	"geoid" text NOT NULL,
	"year" smallint NOT NULL,
	"population" integer NOT NULL,
	"source" text NOT NULL,
	CONSTRAINT "area_population_geoid_year_pk" PRIMARY KEY("geoid","year")
);
--> statement-breakpoint
CREATE TABLE "areas" (
	"geoid" text PRIMARY KEY NOT NULL,
	"level" text NOT NULL,
	"name" text NOT NULL,
	"state_fips" char(2) NOT NULL,
	"land_area_m2" bigint NOT NULL,
	"water_area_m2" bigint NOT NULL,
	"tiger_vintage" smallint NOT NULL,
	"geom" geometry(MultiPolygon,4326) NOT NULL,
	"geom_3857" geometry(MultiPolygon,3857) GENERATED ALWAYS AS (ST_Transform(geom, 3857)) STORED NOT NULL,
	"label_point" geometry(Point,4326) GENERATED ALWAYS AS (ST_PointOnSurface(geom)) STORED NOT NULL,
	CONSTRAINT "areas_level_check" CHECK ("areas"."level" in ('state', 'county'))
);
--> statement-breakpoint
CREATE TABLE "crash_people" (
	"crash_id" bigint NOT NULL,
	"vehicle_number" smallint NOT NULL,
	"person_number" smallint NOT NULL,
	"person_type" text NOT NULL,
	"injury_severity" text NOT NULL,
	"age" smallint,
	"sex" text NOT NULL,
	CONSTRAINT "crash_people_crash_id_vehicle_number_person_number_pk" PRIMARY KEY("crash_id","vehicle_number","person_number")
);
--> statement-breakpoint
CREATE TABLE "crashes" (
	"id" bigint PRIMARY KEY NOT NULL,
	"year" smallint NOT NULL,
	"st_case" integer NOT NULL,
	"month" smallint NOT NULL,
	"crash_date" date,
	"hour" smallint,
	"minute" smallint,
	"fatalities" smallint NOT NULL,
	"persons" smallint NOT NULL,
	"vehicles" smallint NOT NULL,
	"involves_pedestrian" boolean NOT NULL,
	"involves_bicyclist" boolean NOT NULL,
	"involves_motorcyclist" boolean NOT NULL,
	"alcohol_involved" boolean NOT NULL,
	"speeding_involved" boolean NOT NULL,
	"light_condition" text NOT NULL,
	"weather" text NOT NULL,
	"rural_urban" text NOT NULL,
	"functional_class" text NOT NULL,
	"state_fips" char(2) NOT NULL,
	"fars_county_code" char(3),
	"county_geoid" text,
	"county_match" text,
	"geom" geometry(Point,4326),
	"geom_3857" geometry(Point,3857) GENERATED ALWAYS AS (ST_Transform(geom, 3857)) STORED
);
--> statement-breakpoint
CREATE TABLE "datasets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"publisher" text NOT NULL,
	"version" text NOT NULL,
	"source_url" text NOT NULL,
	"license" text NOT NULL,
	"attribution" text NOT NULL,
	"row_count" integer NOT NULL,
	"notes" text,
	"quality_report" jsonb,
	"retrieved_at" timestamp with time zone NOT NULL,
	"loaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "area_population" ADD CONSTRAINT "area_population_geoid_areas_geoid_fk" FOREIGN KEY ("geoid") REFERENCES "public"."areas"("geoid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crash_people" ADD CONSTRAINT "crash_people_crash_id_crashes_id_fk" FOREIGN KEY ("crash_id") REFERENCES "public"."crashes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crashes" ADD CONSTRAINT "crashes_county_geoid_areas_geoid_fk" FOREIGN KEY ("county_geoid") REFERENCES "public"."areas"("geoid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "areas_geom_idx" ON "areas" USING gist ("geom");--> statement-breakpoint
CREATE INDEX "areas_geom_3857_idx" ON "areas" USING gist ("geom_3857");--> statement-breakpoint
CREATE INDEX "areas_level_state_idx" ON "areas" USING btree ("level","state_fips");--> statement-breakpoint
CREATE INDEX "areas_name_trgm_idx" ON "areas" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "crashes_geom_3857_idx" ON "crashes" USING gist ("geom_3857");--> statement-breakpoint
CREATE INDEX "crashes_year_idx" ON "crashes" USING btree ("year");--> statement-breakpoint
CREATE INDEX "crashes_county_year_idx" ON "crashes" USING btree ("county_geoid","year");--> statement-breakpoint
CREATE INDEX "crashes_state_year_idx" ON "crashes" USING btree ("state_fips","year");