import { PatternMatch } from "draft-dsl-match";

module.exports = {
    DSLs: [{ name: "match", dsl: () => new PatternMatch() }],
};
