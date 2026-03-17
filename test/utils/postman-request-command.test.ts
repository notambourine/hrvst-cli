import { Url } from "postman-collection";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Config } from "../../src/utils/config";
import commandModule, {
  httpRequest,
  urlArgOptions,
  USER_AGENT,
} from "../../src/utils/postman-request-command";
import { verticalTable } from "../../src/utils/table";
import { TimeEntry } from "../../src/utils/timer";

function mockFetchResponse<T>(data: T) {
  return {
    ok: true,
    json: () => Promise.resolve(data),
  };
}

const mockConfig: Partial<Config> = {
  accessToken: "test",
  accountId: "test2",
};

vi.mock("../../src/utils/config", () => ({
  getConfig: () => mockConfig,
}));

const args = (args = {}) =>
  Object.assign(
    {
      $0: "",
      _: [],
    },
    args,
  );

describe("postman-request-command", () => {
  describe("handler", () => {
    const { handler } = commandModule({
      command: "test",
      describe: "test",
      request: {
        method: "GET",
        url: {
          protocol: "https",
          host: ["api", "harvestapp", "com"],
          path: ["v2", "time_entries"],
          query: [
            {
              key: "page",
              value: "",
              description: "The page number to use in pagination.",
              disabled: true,
            },
            {
              key: "per_page",
              value: "",
              description:
                "The number of records to return per page. Can range between 1 and 100. (Default: 100)",
              disabled: true,
            },
          ],
        },
      },
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should default to table output", async () => {
      const data = {
        id: 2,
        hours: 4.5,
      };

      global.fetch = vi.fn().mockResolvedValue(mockFetchResponse(data));

      const consoleSpy = vi.spyOn(console, "log");

      await handler(args());

      expect(consoleSpy).toHaveBeenCalledWith(verticalTable(data).toString());
    });

    it("should output json", async () => {
      const data = [
        {
          id: 2,
          hours: 4.5,
        },
      ];

      global.fetch = vi.fn().mockResolvedValue(mockFetchResponse(data));
      const consoleSpy = vi.spyOn(console, "log");

      await handler(
        args({
          output: "json",
        }),
      );

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
    });

    it("should output json object with specified fields", async () => {
      const data = {
        id: 2,
        hours: 4.5,
        project: {
          id: 4,
          name: "Test",
        },
      };
      global.fetch = vi.fn().mockResolvedValue(mockFetchResponse(data));
      const consoleSpy = vi.spyOn(console, "log");

      await handler(
        args({
          fields: "hours,project.name",
          output: "json",
        }),
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify(
          {
            hours: 4.5,
            project: {
              name: "Test",
            },
          },
          null,
          2,
        ),
      );
    });

    it("should output json array with specified fields", async () => {
      const data = [
        {
          id: 2,
          hours: 4.5,
          project: {
            id: 4,
            name: "Test",
          },
        },
      ];
      global.fetch = vi.fn().mockResolvedValue(mockFetchResponse(data));
      const consoleSpy = vi.spyOn(console, "log");

      await handler(
        args({
          fields: "hours,project.name",
          output: "json",
        }),
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify(
          [
            {
              hours: 4.5,
              project: {
                name: "Test",
              },
            },
          ],
          null,
          2,
        ),
      );
    });

    it("should return all of pages when --page=all", async () => {
      const pagedResponses: any = [];
      const timeEntries: Partial<TimeEntry>[] = [];
      const totalPages = 4;

      for (let i = 1; i <= totalPages; i++) {
        const timeEntry = {
          id: i,
          hours: i * 2,
          project: {
            id: 23,
            name: "Test",
          },
        };
        timeEntries.push(timeEntry);
        pagedResponses.push({
          time_entries: [timeEntry],
          page: i,
          next_page: i === totalPages ? null : i + 1,
        });
      }

      global.fetch = vi
        .fn()
        .mockReturnValueOnce(mockFetchResponse(pagedResponses[0]))
        .mockReturnValueOnce(mockFetchResponse(pagedResponses[1]))
        .mockReturnValueOnce(mockFetchResponse(pagedResponses[2]))
        .mockReturnValueOnce(mockFetchResponse(pagedResponses[3]));

      const consoleSpy = vi.spyOn(console, "log");

      await handler({
        $0: "",
        _: [],
        page: "all",
        output: "json",
      });

      expect(fetch).toHaveBeenCalledTimes(totalPages);
      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify(timeEntries, null, 2),
      );
    });
  });

  describe("httpRequest", () => {
    const makeProjectUrl = () =>
      new Url({
        protocol: "https",
        host: ["api", "harvestapp", "com"],
        path: ["v2", "projects", ":project_id"],
        query: [
          {
            key: "client_id",
            value: "",
            description: "The ID of the client to associate this project with.",
          },
          {
            key: "name",
            value: "",
            description: "The name of the project.",
          },
        ],
        variable: [
          {
            key: "project_id",
            value: "",
          },
        ],
      });

    const makeTimeEntriesUrl = () =>
      new Url({
        protocol: "https",
        host: ["api", "harvestapp", "com"],
        path: ["v2", "time_entries", ":time_entry_id"],
        query: [
          {
            key: "project_id",
            value: "",
          },
          {
            key: "task_id",
            value: "",
          },
          {
            key: "spent_date",
            value: "",
          },
          {
            key: "external_reference[id]",
            value: "",
            disabled: true,
          },
          {
            key: "external_reference[group_id]",
            value: "",
            disabled: true,
          },
          {
            key: "external_reference[permalink]",
            value: "",
            disabled: true,
          },
        ],
        variable: [
          {
            key: "time_entry_id",
            value: "",
          },
        ],
      });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("should add query as query string for GET request", async () => {
      const url = makeProjectUrl();
      global.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ data: {} }));

      await httpRequest("GET", url, {
        client_id: 3871864,
        name: "Test project",
        project_id: 3871865,
      });

      expect(fetch).toHaveBeenCalledWith(
        `${url.protocol}://${url.getHost()}/v2/projects/3871865?client_id=3871864&name=Test project`,
        {
          headers: {
            "User-Agent": USER_AGENT,
            Authorization: `Bearer ${mockConfig.accessToken}`,
            "Harvest-Account-ID": mockConfig.accountId,
            "Content-Type": "application/json",
          },
          method: "GET",
        },
      );
    });

    it.each(["PATCH", "POST", "PUT"])(
      "should add query to body for %s request",
      async (method) => {
        const url = makeProjectUrl();
        global.fetch = vi
          .fn()
          .mockResolvedValue(mockFetchResponse({ data: {} }));

        await httpRequest(method, url, {
          client_id: 3871864,
          name: "Test project",
          project_id: 3871865,
        });

        expect(fetch).toHaveBeenCalledWith(
          `${url.protocol}://${url.getHost()}/v2/projects/3871865`,
          {
            body: JSON.stringify({
              client_id: "3871864",
              name: "Test project",
            }),
            headers: {
              "User-Agent": USER_AGENT,
              Authorization: `Bearer ${mockConfig.accessToken}`,
              "Harvest-Account-ID": mockConfig.accountId,
              "Content-Type": "application/json",
            },
            method,
          },
        );
      },
    );

    it("should serialize external_reference fields as a nested object", async () => {
      const url = makeTimeEntriesUrl();
      global.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ data: {} }));

      await httpRequest("POST", url, {
        project_id: 3871864,
        task_id: 3871865,
        spent_date: "2026-03-17",
        "external_reference[id]": "POTENTIAL-123",
        "external_reference[group_id]": "POTENTIAL",
        "external_reference[permalink]": "https://jira.example.com/browse/POTENTIAL-123",
        time_entry_id: 99,
      });

      expect(fetch).toHaveBeenCalledWith(
        `${url.protocol}://${url.getHost()}/v2/time_entries/99`,
        {
          body: JSON.stringify({
            project_id: "3871864",
            task_id: "3871865",
            spent_date: "2026-03-17",
            external_reference: {
              id: "POTENTIAL-123",
              group_id: "POTENTIAL",
              permalink: "https://jira.example.com/browse/POTENTIAL-123",
            },
          }),
          headers: {
            "User-Agent": USER_AGENT,
            Authorization: `Bearer ${mockConfig.accessToken}`,
            "Harvest-Account-ID": mockConfig.accountId,
            "Content-Type": "application/json",
          },
          method: "POST",
        },
      );
    });

    it("should serialize partial external_reference fields", async () => {
      const url = makeTimeEntriesUrl();
      global.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ data: {} }));

      await httpRequest("PATCH", url, {
        "external_reference[id]": "POTENTIAL-123",
        "external_reference[permalink]": "https://jira.example.com/browse/POTENTIAL-123",
        time_entry_id: 99,
      });

      expect(fetch).toHaveBeenCalledWith(
        `${url.protocol}://${url.getHost()}/v2/time_entries/99`,
        {
          body: JSON.stringify({
            external_reference: {
              id: "POTENTIAL-123",
              permalink: "https://jira.example.com/browse/POTENTIAL-123",
            },
          }),
          headers: {
            "User-Agent": USER_AGENT,
            Authorization: `Bearer ${mockConfig.accessToken}`,
            "Harvest-Account-ID": mockConfig.accountId,
            "Content-Type": "application/json",
          },
          method: "PATCH",
        },
      );
    });

    it("should preserve array-style params in the request body", async () => {
      const url = new Url({
        protocol: "https",
        host: ["api", "harvestapp", "com"],
        path: ["v2", "roles"],
        query: [
          {
            key: "name",
            value: "",
          },
        ],
      });
      global.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ data: {} }));

      await httpRequest("POST", url, {
        name: "Engineering",
        "user_ids[0]": 1,
        "user_ids[1]": 2,
      });

      expect(fetch).toHaveBeenCalledWith(
        `${url.protocol}://${url.getHost()}/v2/roles`,
        {
          body: JSON.stringify({
            name: "Engineering",
            user_ids: ["1", "2"],
          }),
          headers: {
            "User-Agent": USER_AGENT,
            Authorization: `Bearer ${mockConfig.accessToken}`,
            "Harvest-Account-ID": mockConfig.accountId,
            "Content-Type": "application/json",
          },
          method: "POST",
        },
      );
    });

    it("should preserve repeated array params already present on the url", async () => {
      const url = new Url({
        protocol: "https",
        host: ["api", "harvestapp", "com"],
        path: ["v2", "roles"],
        query: [
          {
            key: "user_ids[]",
            value: "1",
          },
          {
            key: "user_ids[]",
            value: "2",
          },
        ],
      });
      global.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ data: {} }));

      await httpRequest("POST", url, {});

      expect(fetch).toHaveBeenCalledWith(
        `${url.protocol}://${url.getHost()}/v2/roles`,
        {
          body: JSON.stringify({
            user_ids: ["1", "2"],
          }),
          headers: {
            "User-Agent": USER_AGENT,
            Authorization: `Bearer ${mockConfig.accessToken}`,
            "Harvest-Account-ID": mockConfig.accountId,
            "Content-Type": "application/json",
          },
          method: "POST",
        },
      );
    });
  });

  describe("urlArgOptions", () => {
    it("should create yargs options from postman url", () => {
      const url = new Url({
        protocol: "https",
        host: ["api", "harvestapp", "com"],
        path: ["v2", "projects", ":project_id"],
        query: [
          {
            key: "client_id",
            value: "",
            description: "The ID of the client to associate this project with.",
            disabled: false, // Required option
          },
          {
            key: "name",
            value: "",
            description: "The name of the project.",
            // Require option when 'disabled' is omitted
          },
          {
            key: "is_billable",
            value: "",
            description: "Whether the project is billable or not.",
            disabled: true,
          },
          {
            key: "is_active", // Should not use duplicate "i" alias
            value: "",
            description: "Whether the project is active or not.",
            disabled: true,
          },
          {
            key: "$7b", // Should only use letters for alias
            value: "",
            disabled: true,
          },
          {
            key: "$7b!", // No alias should be created becuase "b" is taken
            value: "",
            disabled: true,
          },
        ],
        variable: [
          {
            key: "project_id",
            value: "",
            description: "The ID of the project you're retrieving.",
          },
        ],
      });
      const options = urlArgOptions(url);
      expect(options).toMatchObject({
        project_id: {
          alias: "p",
          demandOption: true,
          describe: "The ID of the project you're retrieving.",
        },
        client_id: {
          alias: "c",
          demandOption: true,
          describe: "The ID of the client to associate this project with.",
        },
        name: {
          alias: "n",
          demandOption: true,
          describe: "The name of the project.",
        },
        is_billable: {
          alias: "i",
          demandOption: false,
          describe: "Whether the project is billable or not.",
        },
        is_active: {
          alias: "s",
          demandOption: false,
          describe: "Whether the project is active or not.",
        },
        $7b: {
          alias: "b",
          demandOption: false,
          describe: undefined,
        },
        "$7b!": {
          alias: undefined,
          demandOption: false,
          describe: undefined,
        },
      });
    });
  });
});
