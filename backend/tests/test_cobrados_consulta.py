"""Regression fixtures for the SELECT; Oracle is also validated read-only.

SQLite uses numeric days to exercise Oracle TRUNC(date) + 1 boundaries.
Run: python -m unittest discover -s tests -p test_revisar_cobrados.py
"""
import sqlite3
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class RevisarCobradosTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.row_factory = sqlite3.Row
        self.db.create_function('TRUNC', 1, lambda n: None if n is None else int(n))
        self.db.create_function('TO_CHAR', 1, str)
        self.db.create_function('TO_NUMBER', 1, lambda v: None if v is None else int(v))
        self.db.create_function('REGEXP_LIKE', 2, lambda v, p: v is not None and re.fullmatch(p, v) is not None)
        self.db.create_function('NVL', 2, lambda a, b: b if a is None else a)
        self.db.executescript('''
          CREATE TABLE dual(dummy);
          INSERT INTO dual VALUES('X');
          CREATE TABLE bna_presentacionmensualenvio(idpresentacionmensualenv, fechageneracion);
          CREATE TABLE mp_presentacionmensualenvio(idpresentacionmensualenv, fechageneracion, idcanalcobrosalida, idtipoprestamo);
          CREATE TABLE cobrobnadetalle(idpresentacionmensualenv,idcobrobna,idcobrobnareg,idprestador,idprestamo,idcuota,importe,coderror,nrocuenta,idtipoprestamo,vinculacion);
          CREATE TABLE cobrompdetalle(idpresentacionmensualenv,idcobromp,idcobrompreg,idprestador,idprestamo,idcuota,importe,coderror,bloque1cbu,bloque2cbu,idcanal,referencia);
          CREATE TABLE cobrobna(idcobrobna,actuafec,idestadocobrobna,idcanal);
          CREATE TABLE cobromp(idcobromp,actuafec,idestadocobromp);
          CREATE TABLE cobro(idcobro,idtipocobro,idcanal,idtipoprestamo,fecharecepcion);
          CREATE TABLE cobrodetalle(idcobro,idcobroreg,periodohaber,importe,idprestador,idprestamo,idestadocobro);
          CREATE TABLE prestamocuentacorriente(idprestamoctacte,idcobro,idcobroreg,idprestador,idprestamo,idcuota,idtipomovimiento,fechamovimiento,importe,idestadoctacte,ajuste);
          CREATE TABLE bna_presentacionmensual(idpresentacionmensualenv,idprestador,idprestamo,idcuota,periodohaber,estado,importe_cs);
          CREATE TABLE mp_presentacionmensual(idpresentacionmensualenv,idprestador,idprestamo,idcuota,periodohaber,descripcion,importecs,idpresentacionmensualenvreg,idnumerodescuento);
          CREATE TABLE mp_canalcobro(idcanalcobro,descripcion);
          CREATE TABLE prestamo(idprestador,idprestamo,idtipoprestamo,idcanal);
          CREATE TABLE prestamocuotas(idprestador,idprestamo,idcuota,periodohaber);
          CREATE TABLE tipoprestamo(idtipoprestamo,descripcion);
          CREATE TABLE prestador(idprestador,descripcion);
          CREATE TABLE mv_prestamos_mora_completa(idprestamo,idcuota,fechageneracion,periodohaber,tipo_prestamo,prestador,estado_presentacion,motivo_mora,tipotabla,nomtabla);
          INSERT INTO prestador VALUES(66,'Cooperativa');
          INSERT INTO tipoprestamo VALUES(1,'Producto A');
          INSERT INTO prestamo VALUES(66,101,1,2);
          INSERT INTO prestamocuotas VALUES(66,101,1,'202611');
          INSERT INTO mp_canalcobro VALUES(1,'BAPRO');
          INSERT INTO bna_presentacionmensualenvio VALUES(7,10.5),(8,11.9999),(9,12);
          INSERT INTO mp_presentacionmensualenvio VALUES(7,10.5,1,1);
          INSERT INTO cobrobnadetalle VALUES(7,1,1,66,101,1,75.25,'0',' 000321 ',1,'7-1');
          INSERT INTO cobrobnadetalle VALUES(7,1,2,66,101,1,900,'R10',NULL,1,'7-2');
          INSERT INTO cobrobnadetalle VALUES(8,2,1,66,101,1,10.50,'0',NULL,1,'8-1');
          INSERT INTO cobrobnadetalle VALUES(9,3,1,66,101,1,800,'0',NULL,1,'9-1');
          INSERT INTO cobrompdetalle VALUES(7,4,1,66,101,1,20.15,' ok ',' 00000001 ','00000000000002',9,'7-1');
          INSERT INTO cobrobna VALUES(1,10.7,2,1);
          INSERT INTO cobromp VALUES(4,10.7,2);
          INSERT INTO cobro VALUES(100,1,1,1,10),(101,1,2,1,11);
          INSERT INTO cobrodetalle VALUES(100,1,'202611',70.25,66,101,2),(101,1,'202611',20.15,66,101,2);
          INSERT INTO prestamocuentacorriente VALUES(11,100,1,66,101,1,2,10.9,69.25,1,1),(12,101,1,66,101,1,2,11.3,20.15,1,0);
          INSERT INTO bna_presentacionmensual VALUES(7,66,101,1,'202611',0,5.00);
          INSERT INTO mp_presentacionmensual VALUES(7,66,101,1,'202611','OK',0,1,'0000000100000000000003');
          INSERT INTO mv_prestamos_mora_completa VALUES(101,1,10.5,'202611','Producto A','Cooperativa','COBRADO','OK','Consumo','Plan Gold');
          INSERT INTO mv_prestamos_mora_completa SELECT * FROM mv_prestamos_mora_completa;
          INSERT INTO mv_prestamos_mora_completa VALUES(101,1,11.9999,'202611','Producto A','Cooperativa','COBRADO',NULL,'Consumo','Plan Gold');
          INSERT INTO mv_prestamos_mora_completa VALUES(101,1,12,'202611','Producto A','Cooperativa','COBRADO',NULL,'Consumo','Plan Gold');
        ''')

    def tearDown(self):
        self.db.close()

    def query(self, **changes):
        params = dict(periodo_haber='202611', fecha_desde=10, fecha_hasta=11, tipo_prestamo=None, lista=None)
        params.update(changes)
        sql = (ROOT / 'app/features/revisar_cobrados/consulta.sql').read_text(encoding='utf-8').replace('prestaprod.', '')
        return self.db.execute(sql, params).fetchall()

    def test_cobro_real_sin_multiplicar_duplicados_mv(self):
        rows = self.query()
        self.assertEqual(len(rows), 3)
        self.assertAlmostEqual(sum(r['importe_cobrado'] for r in rows), 105.90)
        self.assertEqual(len({(r['fuente_cobro'], r['id_cobro'], r['id_registro']) for r in rows}), 3)

    def test_limite_inclusivo_y_listas_sin_colision_de_bancos(self):
        rows = self.query(lista='BNA / BNA - 7')
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['importe_cobrado'], 75.25)
        self.assertEqual(len(self.query(lista='MP / BAPRO - 7')), 1)
        self.assertEqual(len(self.query(fecha_desde=11)), 1)
        self.db.execute("UPDATE mp_canalcobro SET descripcion='BNA'")
        self.assertEqual(len(self.query(lista='BNA / BNA - 7')), 1)
        self.assertEqual(len(self.query(lista='MP / BNA - 7')), 1)

    def test_filtros_tipo_periodo_y_opcionales(self):
        self.assertEqual(self.query(tipo_prestamo='Otro'), [])
        self.assertEqual(self.query(periodo_haber='202610'), [])
        self.assertEqual(len(self.query(periodo_haber=None)), 3)
        self.assertEqual(self.query(lista='No existe'), [])

    def test_desde_y_hasta_se_aplican_por_separado(self):
        self.assertEqual(len(self.query(periodo_haber=None, fecha_desde=None, fecha_hasta=None)), 4)
        self.assertEqual(len(self.query(periodo_haber=None, fecha_desde=11, fecha_hasta=None)), 2)
        self.assertEqual(len(self.query(periodo_haber=None, fecha_desde=None, fecha_hasta=10)), 2)

    def test_rechazado_no_se_vuelve_exitoso_por_otra_respuesta(self):
        self.db.execute("UPDATE cobrobnadetalle SET coderror='NO COBRADO' WHERE idcobrobna=1 AND idcobrobnareg=1")
        self.assertEqual(len(self.query()), 2)

    def test_datos_aplicacion_solo_con_movimiento_contable_univoco(self):
        bna = self.query(lista='BNA / BNA - 7')[0]
        mp = self.query(lista='MP / BAPRO - 7')[0]
        self.assertEqual(bna['numero_cuenta'], '000321')
        self.assertEqual(mp['numero_cuenta'], '0000000100000000000002')
        self.assertEqual(bna['tipo_producto'], 'Consumo')
        self.assertEqual(bna['plan_producto'], 'Plan Gold')
        self.assertEqual(bna['importe_cobrado'], 75.25)
        self.assertEqual(bna['importe_aplicado'], 69.25)
        self.assertEqual(bna['fecha_aplicacion'], 10.9)
        self.assertEqual(mp['fecha_aplicacion'], 11.3)
        self.assertIsNone(self.query(lista='BNA / BNA - 8')[0]['fecha_aplicacion'])
        self.db.execute('INSERT INTO prestamocuentacorriente VALUES(13,100,1,66,101,1,2,10.95,69.25,1,1)')
        self.assertIsNone(self.query(lista='BNA / BNA - 7')[0]['fecha_aplicacion'])
        self.assertEqual(len(self.query()), 3)

    def test_cuenta_mp_usa_la_presentacion_exacta_si_falta_cbu_en_respuesta(self):
        self.db.execute('UPDATE cobrompdetalle SET bloque1cbu = NULL')
        row = self.query(lista='MP / BAPRO - 7')[0]
        self.assertEqual(row['numero_cuenta'], '0000000100000000000003')
        self.db.execute("UPDATE cobrompdetalle SET referencia = 'sin referencia'")
        self.assertIsNone(self.query(lista='MP / BAPRO - 7')[0]['numero_cuenta'])


if __name__ == '__main__':
    unittest.main()
