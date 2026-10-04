import { PgDialect } from "drizzle-orm/pg-core"
import { describe, expect, it } from "vitest"

import { DEFAULT_CRASH_FILTERS } from "@/lib/filters/crash-filters"

import { crashFilterSql } from "./crash-sql"

const render = (...args: Parameters<typeof crashFilterSql>) =>
  new PgDialect().sqlToQuery(crashFilterSql(...args))

describe("crashFilterSql", () => {
  it("only constrains years by default", () => {
    expect(render(DEFAULT_CRASH_FILTERS)).toMatchObject({
      sql: "c.year BETWEEN $1 AND $2",
      params: [2010, 2024],
    })
  })

  it("returns TRUE when nothing applies", () => {
    expect(render(DEFAULT_CRASH_FILTERS, { includeYears: false }).sql).toBe("TRUE")
  })

  it("ORs road users and expands light options to stored conditions", () => {
    const { sql, params } = render({
      ...DEFAULT_CRASH_FILTERS,
      roadUsers: ["pedestrian", "bicyclist"],
      light: ["twilight", "dark_unlit"],
      settings: ["rural"],
    })
    expect(sql).toBe(
      "c.year BETWEEN $1 AND $2 AND (c.involves_pedestrian OR c.involves_bicyclist) " +
        "AND c.light_condition IN ($3, $4, $5, $6) AND c.rural_urban IN ($7)"
    )
    expect(params).toEqual([
      2010, 2024, "dawn", "dusk", "dark_not_lighted", "dark_unknown_lighting", "rural",
    ])
  })

  it("never interpolates values into SQL text", () => {
    const { sql } = render({ ...DEFAULT_CRASH_FILTERS, roadClasses: ["local", "collector"] })
    expect(sql).not.toContain("local")
    expect(sql).toContain("c.functional_class IN ($3, $4)")
  })
})
