import { readFileSync } from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { parse } from 'yaml';

const specPath = path.resolve(import.meta.dirname, '../../../contracts/openapi.yaml');

/** Valida cuerpos de respuesta contra `components.schemas.<Nombre>` de contracts/openapi.yaml. */
export const createSchemaValidator = () => {
  const spec: unknown = parse(readFileSync(specPath, 'utf8'));
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);
  ajv.addSchema(spec as object, 'openapi');

  return (schemaName: string, body: unknown): { valid: boolean; errors: string } => {
    const validate = ajv.getSchema(`openapi#/components/schemas/${schemaName}`);
    if (!validate) return { valid: false, errors: `schema inexistente: ${schemaName}` };
    const valid = validate(body) === true;
    return { valid, errors: valid ? '' : JSON.stringify(validate.errors) };
  };
};
