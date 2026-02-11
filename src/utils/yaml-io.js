import jsYaml from 'js-yaml';

export function parseYaml(text) {
  return jsYaml.load(text);
}

export function serializeToYaml(data) {
  return jsYaml.dump(data, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  });
}
