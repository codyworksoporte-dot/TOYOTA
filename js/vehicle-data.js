// Vehicle catalog is independent of the WebGL runtime.
// SOURCE: toyota.com.sv (consultado 2026-09-13). Precios, motorización,
// potencia/torque, transmisión y colores son datos públicos y factuales
// tomados del sitio oficial de Toyota El Salvador — se citan como datos,
// no como texto de marketing copiado. Las fotografías del sitio oficial NO
// se han descargado ni reutilizado aquí (son material protegido); en su
// lugar, cada vehículo sigue siendo la geometría procedural de este
// prototipo hasta que se disponga de un modelo 3D con licencia (ver
// assets/models/README.md). Campos sin dato público confirmado permanecen
// como "[DATOS]".
// --------------------------------------------------------------------------
export const VEHICLE_DATA = [
  {
    id: "corolla-sedan-hibrido",
    url: "https://www.toyota.com.sv/vehiculo/corolla-sedan-hybrid/",
    category: "SEDÁN HÍBRIDO",
    name: "Corolla Sedán Híbrido",
    tagline: "El equilibrio perfecto entre estilo, eficiencia y tecnología",
    price: "$29,850",
    color: "#e9eaec",
    bodyType: "sedan",
    model: null, // TODO: "assets/models/corolla-sedan-hibrido.glb"
    colors: ["Blanco Perla", "Negro", "Gris Metálico", "Rojo", "Azul Oscuro", "Celeste Gris"],
    // Foto real proporcionada directamente por quien encargó este prototipo.
    gallery: [{ file: "img/1.png", label: "Frontal 3/4" }],
    specs: {
      engine: "Híbrido eléctrico auto-recargable 1.8L, 4 cil., 16V DOHC VVT-i",
      power: "138 H.P. combinados",
      torque: "142 Nm / 3,900 rpm",
      transmission: "CVT, tracción delantera",
      driveModes: "Normal, Eco, Sport",
      suspension: "Delantera McPherson / trasera doble brazo",
      consumption: "[DATOS]",
      trunk: "[DATOS]",
      seats: "5",
    },
  },
  {
    id: "corolla-cross-hibrida",
    url: "https://www.toyota.com.sv/vehiculo/corolla-cross-hibrida/",
    category: "CROSSOVER HÍBRIDO",
    name: "Corolla Cross Híbrida",
    tagline: "Diseño moderno y dinámico con tecnología híbrida de Toyota",
    price: "$38,850",
    color: "#c9cbd1",
    bodyType: "suv",
    model: null, // TODO: "assets/models/corolla-cross-hibrida.glb"
    colors: ["Azul Metálico", "Blanco Perla", "Blanco", "Gris Oscuro", "Plata Metálico", "Negro", "Rojo"],
    // Fotografías reales proporcionadas por el usuario (no descargadas del
    // sitio oficial) — ver /img/Galeria-1..6.jpg.
    gallery: [
      { file: "img/Galeria-2.jpg", label: "Trasera 3/4" },
      { file: "img/Galeria-1.jpg", label: "Lateral" },
      { file: "img/Galeria-3.jpg", label: "Superior" },
      { file: "img/Galeria-4.jpg", label: "Frontal" },
      { file: "img/Galeria-5.jpg", label: "Faro — detalle" },
      { file: "img/Galeria-6.jpg", label: "Interior — tablero" },
    ],
    specs: {
      engine: "1,798 c.c., 4 cilindros, híbrido gasolina/eléctrico",
      power: "[DATOS]",
      torque: "142 Nm / 3,600 rpm (200 Nm@4,400-4,800 según versión)",
      transmission: "CVT secuencial",
      driveModes: "Eco, Power",
      battery: "6.5 AH",
      tires: "225/50R18 (215/60R17 según versión)",
      suspension: "Delantera McPherson",
      connectivity: "Pantalla táctil 8\", Android Auto, Apple CarPlay, Bluetooth",
      airbags: "7 (2 frontales, 2 laterales, 2 cortina, 1 rodilla del conductor)",
      brakes: "ABS con EBD",
      stability: "Control de estabilidad VSC + asistente de arranque en pendiente (HAC)",
      consumption: "[DATOS]",
      trunk: "[DATOS]",
      seats: "5",
    },
  },
  {
    id: "rav4-hibrida",
    url: "https://www.toyota.com.sv/vehiculo/rav4-hibrida/",
    category: "SUV HÍBRIDA",
    name: "RAV4 Híbrida",
    tagline: "Potencia, tecnología y eficiencia para ir más lejos",
    price: "$45,150",
    color: "#8a8d93",
    bodyType: "suv",
    model: null, // TODO: "assets/models/rav4-hibrida.glb"
    colors: ["Massive Gray", "Urban Rock", "Red MC", "Avant-Garde Bronze ME", "Ever Rest", "Dk. Blue", "Super White", "Platinum Pearl", "Attitude Black"],
    // Foto real proporcionada directamente por quien encargó este prototipo.
    gallery: [{ file: "img/3.avif", label: "Frontal 3/4" }],
    specs: {
      engine: "Híbrido 2.5L — motor gasolina 183 H.P./6,000 rpm + motor eléctrico 100 kW",
      power: "Hasta 324 H.P. combinados",
      torque: "221 Nm",
      transmission: "Automática E-CVT",
      driveModes: "Normal, Eco, Sport, Eléctrico (EV)",
      consumption: "[DATOS]",
      trunk: "[DATOS]",
      seats: "5",
    },
  },
  {
    id: "hilux-2-8",
    url: "https://www.toyota.com.sv/vehiculo/hilux-2019/",
    category: "PICKUP",
    name: "Hilux 2.8L",
    tagline: "La fuerza se llama Hilux",
    price: "$37,700",
    color: "#3d4046",
    bodyType: "pickup",
    model: null, // TODO: "assets/models/hilux-2-8.glb"
    colors: ["Rojo", "Negro", "Blanco", "Gris", "Plata", "Blanco Perla"],
    // Foto real proporcionada directamente por quien encargó este prototipo.
    gallery: [{ file: "img/4.jpg", label: "Frontal 3/4" }],
    specs: {
      engine: "Turbo diésel intercooler 2.8L",
      power: "174 H.P.",
      transmission: "4x2 / 4x4, mecánica o automática según versión",
      brakes: "ABS en las 4 ruedas",
      lights: "Faros frontales LED",
      consumption: "[DATOS]",
      trunk: "[DATOS]",
      seats: "5",
    },
  },
  {
    id: "land-cruiser-prado",
    url: "https://www.toyota.com.sv/vehiculo/land-cruiser-prado/",
    category: "TODOTERRENO PREMIUM",
    name: "Land Cruiser Prado",
    tagline: "Descubre la excelencia en cada detalle",
    price: "$94,900",
    color: "#17181c",
    bodyType: "offroad",
    model: null, // TODO: "assets/models/land-cruiser-prado.glb"
    colors: ["Blanco Perla", "Negro", "Bronce", "Gris Oscuro"],
    specs: {
      engine: "Turbo diésel intercooler 2.8L (también disponible gasolina turbo 2.4L)",
      power: "201 H.P. diésel / 277 H.P. gasolina",
      torque: "500 Nm diésel / 430 Nm gasolina",
      transmission: "Automática de 8 velocidades",
      tires: "265/65R18",
      consumption: "[DATOS]",
      trunk: "[DATOS]",
      seats: "7",
    },
  },
];
