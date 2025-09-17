import { KnipConfig } from "knip";

const config: KnipConfig = {
  compilers: {
    css: (text: string) => [...text.matchAll(/(?<=@)import[^;]+/g)].join("\n"),
  },
  ignoreDependencies: ["eslint-config-next"],
};

export default config;
