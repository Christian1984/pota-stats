// Pin timezone to UTC so date-formatting tests are deterministic across environments
process.env.TZ = "UTC";

import "@testing-library/jest-dom";
