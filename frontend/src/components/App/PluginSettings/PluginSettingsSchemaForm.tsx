/*
 * Copyright 2026 The Kubernetes Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { useEffect, useMemo } from 'react';
import { useTranslation } from '../../../plugin/pluginI18n';
import { useTypedSelector } from '../../../redux/hooks';
import { PluginSettingsAPI } from '../../../settings/pluginSettings';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

interface PluginSettingsSchemaFormProps {
  pluginName: string;
  schema: Record<string, any>;
  data: Record<string, any>;
  onDataChange: (data: Record<string, any>) => void;
  onValidityChange: (valid: boolean) => void;
}

function errorField(error: ErrorObject): string {
  if (error.keyword === 'required') {
    return String(error.params.missingProperty);
  }
  return error.instancePath.replace(/^\//, '').split('/')[0];
}

function schemaErrorMessage(schema: Record<string, any>, error: ErrorObject): string | undefined {
  const field = errorField(error);
  const target = field ? schema.properties?.[field] : schema;
  const message = target?.errorMessage ?? schema.errorMessage;
  if (typeof message === 'string') {
    return message;
  }
  return message?.[error.keyword];
}

export default function PluginSettingsSchemaForm(props: PluginSettingsSchemaFormProps) {
  const { pluginName, schema, data, onDataChange, onValidityChange } = props;
  const { t } = useTranslation(pluginName);
  useTypedSelector(state => state.adminSettings);
  const effectiveData = useMemo(() => {
    const knownValues = Object.fromEntries(
      Object.entries<Record<string, any>>(schema.properties ?? {}).flatMap(([name, field]) => {
        const value = data[name] ?? PluginSettingsAPI.get(pluginName, name) ?? field.default;
        return value === undefined ? [] : [[name, value]];
      })
    );
    return schema.additionalProperties === false ? knownValues : { ...data, ...knownValues };
  }, [data, pluginName, schema]);
  const validation = useMemo(() => {
    try {
      const validate = ajv.compile(schema);
      const valid = validate(effectiveData);
      return { valid: Boolean(valid), errors: validate.errors ?? [] };
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            keyword: 'schema',
            instancePath: '',
            schemaPath: '',
            params: {},
            message: error instanceof Error ? error.message : String(error),
          } as ErrorObject,
        ],
      };
    }
  }, [effectiveData, schema]);

  useEffect(() => {
    onValidityChange(validation.valid);
  }, [onValidityChange, validation.valid]);

  const errorsByField = useMemo(() => {
    const result: Record<string, string> = {};
    for (const error of validation.errors) {
      const field = errorField(error);
      const message = schemaErrorMessage(schema, error) ?? error.message ?? 'Invalid value';
      result[field] = t(message);
    }
    return result;
  }, [schema, t, validation.errors]);

  function update(name: string, value: any) {
    const next = { ...data };
    if (value === undefined) {
      delete next[name];
    } else {
      next[name] = value;
    }
    onDataChange(next);
  }

  return (
    <Stack spacing={2} sx={{ p: 1 }}>
      {schema.description && <Alert severity="info">{t(schema.description)}</Alert>}
      {Object.entries<Record<string, any>>(schema.properties ?? {}).map(([name, field]) => {
        if (PluginSettingsAPI.isHidden(pluginName, name)) {
          return null;
        }
        const label = t(field.title ?? name);
        const error = errorsByField[name];
        const disabled = PluginSettingsAPI.isDisabled(pluginName, name);
        if (field.type === 'boolean') {
          return (
            <FormControlLabel
              key={name}
              control={
                <Checkbox
                  checked={effectiveData[name] ?? false}
                  disabled={disabled}
                  onChange={event => update(name, event.target.checked)}
                />
              }
              label={label}
            />
          );
        }

        const isNumber = field.type === 'number' || field.type === 'integer';
        return (
          <TextField
            key={name}
            label={label}
            value={effectiveData[name] ?? ''}
            disabled={disabled}
            type={isNumber ? 'number' : 'text'}
            select={Array.isArray(field.enum)}
            required={schema.required?.includes(name)}
            error={Boolean(error)}
            helperText={error ?? (field.description ? t(field.description) : undefined)}
            inputProps={{
              min: field.minimum,
              max: field.maximum,
              step: field.type === 'integer' ? 1 : undefined,
            }}
            onChange={event => {
              const value = event.target.value;
              update(name, isNumber ? (value === '' ? undefined : Number(value)) : value);
            }}
          >
            {field.enum?.map((option: string | number) => (
              <MenuItem key={String(option)} value={option}>
                {t(String(field.enumNames?.[field.enum.indexOf(option)] ?? option))}
              </MenuItem>
            ))}
          </TextField>
        );
      })}
      {errorsByField[''] && <Alert severity="error">{errorsByField['']}</Alert>}
    </Stack>
  );
}
