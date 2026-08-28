import express from "express";
import multer from "multer";

const router = express.Router();

const upload = multer({ dest: "uploads/" }); // Guarda en carpeta temporal "uploads/"

import {
  subirActaController,
  getListKizeoController,
  updateListController,
  fusionarArchivosController,
  crearReporteController,
  enviarReporteController,
  updateHistoricoController,
  enviarReporteHistoricoController,
} from "../controllers/kizeoController.js";

//Ruta para el manejo de las actas al sharepoint
router.post("/webhook", subirActaController);

router.post("/reportes", crearReporteController);

router.post("/enviar_reportes", enviarReporteController);

// Ruta para obtener las listas desde la API externa
router.get("/lists", getListKizeoController);

// Ruta para actualizar la lista de kizeo desde un archivo excel
router.post("/updatelist", upload.single("excelFile"), updateListController);

router.post(
  "/fusionarExcel",
  upload.fields([
    { name: "reporteAfianzado", maxCount: 1 },
    { name: "baseCartera", maxCount: 1 },
  ]),
  fusionarArchivosController
);

router.post(
  "/updateHistorico",
  updateHistoricoController
);

router.post(
  "/enviarHistorico",
  enviarReporteHistoricoController
);

import { kizeoVisitasWebhookController } from "../controllers/kizeoVisitasController.js";

// Webhook dedicado a VISITAS (no colisiona con tu /webhook existente)
router.post("/webhook/visitas", kizeoVisitasWebhookController);

import {
  generarExcelVisitasAyerController,
  generarExcelVisitasPorFechaController,
  enviarExcelVisitasAyerController,
  enviarExcelVisitasPorFechaController,
} from "../controllers/visitasReportController.js";

// Generar Excel
router.post("/reportes/visitas/ayer", generarExcelVisitasAyerController);
router.post("/reportes/visitas", generarExcelVisitasPorFechaController); // ?date=YYYY-MM-DD

// Generar y ENVIAR (Graph)
router.post("/enviar_reportes/visitas/ayer", enviarExcelVisitasAyerController);
router.post("/enviar_reportes/visitas", enviarExcelVisitasPorFechaController); // ?date=YYYY-MM-DD

import {
  generarExcelAPVisitasMesController,
  generarExcelAPVisitasPorFechaController,
  generarExcelAPVisitasFueraMadridPorFechaController,
  enviarExcelAPVisitasMesController,
  enviarExcelAPVisitasPorFechaController,
  enviarExcelAPVisitasFueraMadridPorFechaController
} from "../controllers/APVisitasReportController.js";

router.post("/reportes/ap/visitas/mes", generarExcelAPVisitasMesController);
router.post("/reportes/ap/visitas/semana/fuera_madrid", generarExcelAPVisitasFueraMadridPorFechaController);
router.post("/reportes/ap/visitas/semana", generarExcelAPVisitasPorFechaController);

router.post("/enviar_reportes/ap/visitas/mes", enviarExcelAPVisitasMesController);
router.post("/enviar_reportes/ap/visitas/semana/fuera_madrid", enviarExcelAPVisitasFueraMadridPorFechaController);
router.post("/enviar_reportes/ap/visitas/semana", enviarExcelAPVisitasPorFechaController);

export default router;
