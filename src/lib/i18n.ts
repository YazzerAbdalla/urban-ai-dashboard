import { create } from "zustand";

export type Lang = "en" | "ar";

type Dict = Record<string, { en: string; ar: string }>;

export const dict: Dict = {
  app_title: { en: "Urban AI Dashboard", ar: "لوحة الذكاء الحضري" },
  mock_mode: { en: "MOCK MODE", ar: "وضع تجريبي" },
  area_selection: { en: "Area selection", ar: "اختيار المنطقة" },
  search_place: { en: "Search city (e.g. Cairo)", ar: "ابحث عن مدينة (مثال: القاهرة)" },
  draw_bbox: { en: "Draw bbox (D)", ar: "ارسم مربعًا (D)" },
  load_area: { en: "Load area", ar: "تحميل المنطقة" },
  cells_estimate: { en: "Estimated cells", ar: "عدد الخلايا المقدر" },
  warn_300: { en: "Large area — may be slow", ar: "منطقة كبيرة — قد تكون بطيئة" },
  block_500: { en: "Too large — reduce area or grid size", ar: "كبيرة جدًا — قلل المساحة" },
  grid_config: { en: "Grid configuration", ar: "إعداد الشبكة" },
  grid_size: { en: "Grid size", ar: "حجم الخلية" },
  projection_label: { en: "Projection: EPSG:32636 (metric)", ar: "الإسقاط: EPSG:32636 (متري)" },
  modalities: { en: "Modalities", ar: "الوسائط" },
  modality_poi: { en: "POI", ar: "نقاط الاهتمام" },
  modality_image: { en: "Image", ar: "الصور" },
  modality_graph: { en: "Graph", ar: "الرسم البياني" },
  modality_text: { en: "Text", ar: "النص" },
  ablation_preset: { en: "Ablation preset", ar: "إعداد الاستئصال" },
  preset_custom: { en: "Custom", ar: "مخصص" },
  preset_poi_only: { en: "POI only", ar: "POI فقط" },
  preset_poi_image: { en: "POI + Image", ar: "POI + صور" },
  preset_poi_image_graph: { en: "POI + Image + Graph", ar: "POI + صور + رسم" },
  preset_all: { en: "All modalities", ar: "كل الوسائط" },
  model: { en: "Model", ar: "النموذج" },
  model_mlp: { en: "MLP", ar: "MLP" },
  model_gnn: { en: "GNN (spatial)", ar: "GNN (مكاني)" },
  fusion: { en: "Fusion method", ar: "طريقة الدمج" },
  fusion_concat: { en: "Concatenation", ar: "تجميع" },
  fusion_weighted: { en: "Weighted", ar: "موزون" },
  fusion_attention: { en: "Attention", ar: "انتباه" },
  classify: { en: "Classify (C)", ar: "تصنيف (C)" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  layers: { en: "Layers", ar: "الطبقات" },
  layer_classification: { en: "Classification", ar: "التصنيف" },
  layer_poi: { en: "POI heatmap", ar: "خريطة POI" },
  layer_roads: { en: "Roads", ar: "الطرق" },
  layer_graph: { en: "Graph topology", ar: "هيكل الرسم" },
  layer_satellite: { en: "Satellite", ar: "قمر صناعي" },
  cell_detail: { en: "Cell detail", ar: "تفاصيل الخلية" },
  evaluation: { en: "Evaluation", ar: "التقييم" },
  cell_story: { en: "Cell Story (POI semantic vector)", ar: "قصة الخلية (متجه دلالي POI)" },
  cell_story_sub: { en: "384-dim MLLM embedding (aggregated)", ar: "تضمين MLLM ٣٨٤ بُعدًا (مجمّع)" },
  graph_metrics: { en: "Graph metrics", ar: "مقاييس الرسم" },
  embeddings: { en: "Embedding norms", ar: "معايير التضمين" },
  satellite: { en: "Satellite thumbnail", ar: "صورة قمر صناعي" },
  pin_compare: { en: "Pin to compare", ar: "تثبيت للمقارنة" },
  unpin: { en: "Unpin", ar: "إلغاء التثبيت" },
  loading_step: { en: "Loading", ar: "جارٍ التحميل" },
  step_downloading_poi: { en: "Downloading POI…", ar: "تحميل نقاط الاهتمام…" },
  step_mapping_poi_to_nodes: { en: "Mapping POI → graph nodes…", ar: "ربط POI بعقد الرسم…" },
  step_building_graph: { en: "Building road graph…", ar: "بناء رسم الطرق…" },
  step_classifying: { en: "Classifying cells…", ar: "تصنيف الخلايا…" },
  ground_truth: { en: "Upload ground truth (CSV)", ar: "ارفع البيانات الحقيقية (CSV)" },
  accuracy: { en: "Accuracy", ar: "الدقة" },
  macro_f1: { en: "Macro F1", ar: "Macro F1" },
  weighted_f1: { en: "Weighted F1", ar: "Weighted F1" },
  spatial_accuracy: { en: "Spatial Accuracy", ar: "الدقة المكانية" },
  per_class_f1: { en: "Per-class F1", ar: "F1 لكل صنف" },
  confusion_matrix: { en: "Confusion matrix", ar: "مصفوفة الالتباس" },
  no_classification: { en: "Run classification to see metrics", ar: "شغّل التصنيف لعرض المقاييس" },
  distribution: { en: "Distribution", ar: "التوزيع" },
  avg_confidence: { en: "Avg confidence", ar: "متوسط الثقة" },
  nav_dashboard: { en: "Dashboard", ar: "لوحة" },
  nav_mllm: { en: "MLLM Builder", ar: "منشئ MLLM" },
  nav_twin: { en: "Digital Twin", ar: "التوأم الرقمي" },
  nav_training: { en: "Training Lab", ar: "مختبر التدريب" },
  nav_ablation: { en: "Ablation", ar: "الاستئصال" },
  coming_v2: { en: "Coming in v2", ar: "قريبًا في الإصدار 2" },
  back_to_dashboard: { en: "Back to dashboard", ar: "العودة إلى اللوحة" },
  draw_area: { en: "Draw area", ar: "ارسم منطقة" },
  drawing_mode: { en: "Drawing mode — click & drag on the map", ar: "وضع الرسم — اسحب على الخريطة" },
  clear_area: { en: "Clear area", ar: "مسح المنطقة" },
  custom_area_active: { en: "Custom area active", ar: "منطقة مخصصة نشطة" },
  open_full_details: { en: "Open full details", ar: "افتح التفاصيل الكاملة" },
  grid_details: { en: "Grid details", ar: "تفاصيل الخلية" },
  dominant_class: { en: "Dominant class", ar: "الفئة المهيمنة" },
  confidence: { en: "Confidence", ar: "الثقة" },
  pois_in_cell: { en: "POIs in cell", ar: "النقاط داخل الخلية" },
  show_roads: { en: "Show roads", ar: "عرض الطرق" },
  cell_not_found: { en: "Cell not found", ar: "الخلية غير موجودة" },
  loading: { en: "Loading…", ar: "جارٍ التحميل…" },
  res: { en: "Residential", ar: "سكني" },
  com: { en: "Commercial", ar: "تجاري" },
  ind: { en: "Industrial", ar: "صناعي" },
  vector_breakdown: { en: "224-dim vector: POI 64 · Image 64 · Graph 32 · Text 64", ar: "متجه ٢٢٤ بُعدًا: POI ٦٤ · صور ٦٤ · رسم ٣٢ · نص ٦٤" },
  thumbnail_empty: { en: "No satellite thumbnail available", ar: "لا توجد صورة قمر صناعي" },
  cell_details_title: { en: "Cell Details", ar: "تفاصيل الخلية" },
  cell_pois_title: { en: "Cell POIs", ar: "نقاط الاهتمام في الخلية" },
  poi_count: { en: "POI count", ar: "عدد نقاط الاهتمام" },
  poi_categories: { en: "POI categories", ar: "فئات نقاط الاهتمام" },
  no_pois_in_cell: { en: "No POIs found inside this cell", ar: "لا توجد نقاط اهتمام داخل هذه الخلية" },
  load_pois_error: { en: "Failed to load POI data", ar: "فشل تحميل بيانات نقاط الاهتمام" },
  retry: { en: "Retry", ar: "إعادة المحاولة" },
  back_to_classification: { en: "Back to Classification", ar: "العودة إلى التصنيف" },
  cell_not_found_in_result: { en: "Cell not found in classification result", ar: "الخلية غير موجودة في نتيجة التصنيف" },
  nav_poi_heatmap: { en: "POI Heatmap", ar: "خريطة POI" },
  internal_poi_heatmap_title: { en: "POI Heatmap", ar: "خريطة POI" },
  internal_poi_heatmap_badge: { en: "Internal", ar: "داخلي" },
  internal_poi_heatmap_stat_total: { en: "Total POIs", ar: "إجمالي POI" },
  internal_poi_heatmap_stat_categories: { en: "Categories", ar: "الفئات" },
  internal_poi_heatmap_stat_source: { en: "Dataset Source", ar: "مصدر البيانات" },
  internal_poi_heatmap_stat_zoom: { en: "Current Zoom", ar: "التكبير الحالي" },
  internal_poi_heatmap_stat_coords: { en: "Mouse Coords", ar: "إحداثيات الماوس" },
  internal_poi_heatmap_legend: { en: "Legend", ar: "وسيلة الإيضاح" },
  internal_poi_heatmap_density: { en: "Density", ar: "الكثافة" },
  internal_poi_heatmap_point: { en: "Point (zoom ≥ 15)", ar: "نقطة (تكبير ≥ ١٥)" },
  internal_poi_heatmap_empty: { en: "No POIs were found in the dataset.", ar: "لم يتم العثور على نقاط اهتمام في مجموعة البيانات." },
  internal_poi_heatmap_error: { en: "Failed to load POI dataset.", ar: "فشل تحميل مجموعة بيانات POI." },
  internal_poi_heatmap_statistics: { en: "Statistics", ar: "الإحصائيات" },

  poi_analysis_title: { en: "POI Analysis", ar: "تحليل نقاط الاهتمام" },
  poi_analysis_draw_rect: { en: "Rectangle", ar: "مستطيل" },
  poi_analysis_draw_polygon: { en: "Polygon", ar: "مضلع" },
  poi_analysis_edit: { en: "Edit", ar: "تعديل" },
  poi_analysis_delete: { en: "Delete", ar: "حذف" },
  poi_analysis_zoom_selection: { en: "Zoom to Selection", ar: "تكبير للتحديد" },
  poi_analysis_area: { en: "Area (km²)", ar: "المساحة (كم²)" },
  poi_analysis_perimeter: { en: "Perimeter (km)", ar: "المحيط (كم)" },
  poi_analysis_center: { en: "Center Coords", ar: "إحداثيات المركز" },
  poi_analysis_export: { en: "Export JSON", ar: "تصدير JSON" },
  poi_analysis_search_placeholder: { en: "Search by name, category, or type…", ar: "ابحث بالاسم أو الفئة أو النوع…" },
  poi_analysis_all_categories: { en: "All Categories", ar: "جميع الفئات" },
  poi_analysis_summary_area: { en: "Area Name", ar: "اسم المنطقة" },
  poi_analysis_summary_pois: { en: "POIs", ar: "نقاط الاهتمام" },
  poi_analysis_summary_density: { en: "Density", ar: "الكثافة" },
  poi_analysis_summary_dominant: { en: "Dominant", ar: "السائد" },
  poi_analysis_draw_hint_rect: { en: "Click & drag to draw rectangle", ar: "انقر واسحب لرسم مستطيل" },
  poi_analysis_draw_hint_polygon: { en: "Click to place vertices, double-click to finish", ar: "انقر لوضع النقاط، انقر مرتين للإنهاء" },
};

interface I18nState {
  lang: Lang;
  setLang: (l: Lang) => void;
}

export const useI18nStore = create<I18nState>((set) => ({
  lang: (typeof window !== "undefined" && (localStorage.getItem("lang") as Lang)) || "en",
  setLang: (l) => {
    localStorage.setItem("lang", l);
    document.documentElement.setAttribute("lang", l);
    document.documentElement.setAttribute("dir", l === "ar" ? "rtl" : "ltr");
    set({ lang: l });
  },
}));

export function useI18n() {
  const lang = useI18nStore((s) => s.lang);
  const setLang = useI18nStore((s) => s.setLang);
  const t = (key: keyof typeof dict) => dict[key]?.[lang] ?? String(key);
  return { t, lang, setLang };
}

/** Initialize <html dir/lang> on first import */
if (typeof window !== "undefined") {
  const l = useI18nStore.getState().lang;
  document.documentElement.setAttribute("lang", l);
  document.documentElement.setAttribute("dir", l === "ar" ? "rtl" : "ltr");
}