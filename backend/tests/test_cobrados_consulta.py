"""Regression fixtures for the SELECT; Oracle is also validated read-only.

SQLite uses numeric days to exercise Oracle TRUNC(date) + 1 boundaries.
Run: python -m unittest discover -s tests -p test_revisar_cobrados.py
"""
import sqlite3
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class RevisarCobradosTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.row_factory = sqlite3.Row
        self.db.create_function('TRUNC', 1, lambda n: None if n is None else int(n))
        self.db.create_function('TO_CHAR', 1, str)
        self.db.create_function('NVL', 2, lambda a, b: b if a is None else a)
        self.db.executescript('''
          CREATE TABLE dual(dummy);
          INSERT INTO dual VALUES('X');
          CREATE TABLE bna_presentacionmensualenvio(idpresentacionmensualenv, fechageneracion);
          CREATE TABLE mp_presentacionmensualenvio(idpresentacionmensualenv, fechageneracion, idcanalcobrosalida);
          CREATE TABLE cobrobnadetalle(idpresentacionmensualenv,idcobrobna,idcobrobnareg,idprestador,idprestamo,idcuota,importe,coderror);
          CREATE TABLE cobrompdetalle(idpresentacionmensualenv,idcobromp,idcobrompreg,idprestador,idprestamo,idcuota,importe,coderror);
          CREATE TABLE mp_canalcobro(idcanalcobro,descripcion);
          CREATE TABLE prestamo(idprestador,idprestamo,idtipoprestamo);
          CREATE TABLE prestamocuotas(idprestador,idprestamo,idcuota,periodohaber);
          CREATE TABLE tipoprestamo(idtipoprestamo,descripcion);
          CREATE TABLE prestador(idprestador,descripcion);
          CREATE TABLE mv_prestamos_mora_completa(idprestamo,idcuota,fechageneracion,periodohaber,tipo_prestamo,prestador,estado_presentacion,motivo_mora);
          INSERT INTO prestador VALUES(66,'Cooperativa');
          INSERT INTO tipoprestamo VALUES(1,'Producto A');
          INSERT INTO prestamo VALUES(66,101,1);
          INSERT INTO prestamocuotas VALUES(66,101,1,'202611');
          INSERT INTO mp_canalcobro VALUES(1,'BAPRO');
          INSERT INTO bna_presentacionmensualenvio VALUES(7,10.5),(8,11.9999),(9,12);
          INSERT INTO mp_presentacionmensualenvio VALUES(7,10.5,1);
          INSERT INTO cobrobnadetalle VALUES(7,1,1,66,101,1,75.25,'0');
          INSERT INTO cobrobnadetalle VALUES(7,1,2,66,101,1,900,'R10');
          INSERT INTO cobrobnadetalle VALUES(8,2,1,66,101,1,10.50,'0');
          INSERT INTO cobrobnadetalle VALUES(9,3,1,66,101,1,800,'0');
          INSERT INTO cobrompdetalle VALUES(7,4,1,66,101,1,20.15,' ok ');
          INSERT INTO mv_prestamos_mora_completa VALUES(101,1,10.5,'202611','Producto A','Cooperativa','COBRADO','OK');
          INSERT INTO mv_prestamos_mora_completa SELECT * FROM mv_prestamos_mora_completa;
          INSERT INTO mv_prestamos_mora_completa VALUES(101,1,11.9999,'202611','Producto A','Cooperativa','COBRADO',NULL);
          INSERT INTO mv_prestamos_mora_completa VALUES(101,1,12,'202611','Producto A','Cooperativa','COBRADO',NULL);
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



if __name__ == '__main__':
    unittest.main()
