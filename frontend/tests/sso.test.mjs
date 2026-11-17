import test from 'node:test';
import assert from 'node:assert/strict';
import {
  armarUrlSistemaCentral,
  extraerTokenSsoDeUrl,
} from '../src/utils/ssoHelpers.ts';

test('extraerTokenSsoDeUrl extrae token de query y preserva otros parámetros en la URL limpia', () => {
  const res = extraerTokenSsoDeUrl('?token=abc-123&vista=simulador', '', '/prestamos');
  assert.equal(res.token, 'abc-123');
  assert.equal(res.nuevaUrl, '/prestamos?vista=simulador');
});

test('extraerTokenSsoDeUrl extrae token desde hash fragment y limpia Prefijo Bearer', () => {
  const res = extraerTokenSsoDeUrl('', '#token=Bearer%20tok-xyz&foo=bar', '/');
  assert.equal(res.token, 'tok-xyz');
  assert.equal(res.nuevaUrl, '/#foo=bar');
});

test('extraerTokenSsoDeUrl ignora valores vacíos o literales null/undefined', () => {
  assert.deepEqual(extraerTokenSsoDeUrl('', '', '/'), { token: null, nuevaUrl: null });
  const nulo = extraerTokenSsoDeUrl('?token=undefined', '', '/');
  assert.equal(nulo.token, null);
  assert.equal(nulo.nuevaUrl, '/');
});

test('armarUrlSistemaCentral normaliza base y adjunta ruta /Principal/Inicio/{token}', () => {
  assert.equal(
    armarUrlSistemaCentral('https://test.coopya.com.ar/', 'tok 1+2'),
    'https://test.coopya.com.ar/Principal/Inicio/tok%201%2B2'
  );
  assert.equal(
    armarUrlSistemaCentral(undefined, ''),
    'https://test.coopya.com.ar/'
  );
});
