// Spanish strings. Typed against the English catalog, so a missing or extra
// key fails the type check.
import type { en } from "./en.ts";

export const es: Record<keyof typeof en, string> = {
  "app.name": "CasaPerfecto",
  "app.tagline": "Camina al trabajo. Paga la renta. Conoce la cuadra.",
  "app.area": "San Francisco, a menos de 45 minutos a pie de 350 Bush St",
  "skip.main": "Ir al panel",

  "unit.minutes": "{n} min",
  "unit.noRoute": "Sin ruta",
  "unit.perMonth": "{amount} al mes",
  "unit.studio": "Estudio",
  "unit.1b1b": "1 recámara, 1 baño",
  "unit.2b1b": "2 recámaras, 1 baño",
  "unit.2b2b": "2 recámaras, 2 baños",
  "unit.3b": "3 recámaras",

  "common.next": "Siguiente",
  "common.back": "Atrás",
  "common.save": "Guardar",
  "common.edit": "Editar",
  "common.remove": "Quitar",
  "common.close": "Cerrar",
  "common.cancel": "Cancelar",
  "common.retry": "Intentar de nuevo",
  "common.loading": "Cargando…",

  "welcome.title": "Encuentra un hogar desde donde caminar al trabajo",
  "welcome.body":
    "Elige dónde trabajas y qué tan lejos irías. CasaPerfecto sombrea cada cuadra a tu alcance, muestra la renta que tu salario permite y agrega datos públicos de seguridad cuando los quieras.",
  "welcome.promise1": "Nada de lo que escribas sale de este dispositivo.",
  "welcome.promise2": "Sin cuentas.",
  "welcome.promise3": "Sin rastreo.",
  "welcome.start": "Empezar",
  "welcome.methods": "Cómo se calcula",
  "links.privacy": "Política de privacidad",
  "links.accessibility": "Declaración de accesibilidad",

  "onboarding.label": "Configura tu búsqueda",
  "onboarding.step": "Paso {n} de {total}",
  "onboarding.finish": "Ver el mapa",

  "city.title": "¿Dónde estás buscando?",
  "city.legend": "Ciudad",
  "city.sf": "San Francisco",
  "city.sfDetail":
    "A menos de 45 minutos a pie de 350 Bush St, de North Beach a Mission Bay.",
  "city.more": "Más ciudades después",

  "workplace.title": "¿Dónde trabajas?",
  "workplace.legend": "Lugar de trabajo",
  "workplace.default": "350 Bush St, Financial District",
  "workplace.search": "Cerca de un cruce de calles",
  "workplace.searchLabel": "Cruce cerca de tu trabajo",
  "workplace.searchHint":
    "Empieza a escribir el nombre de una calle, por ejemplo Market Street & 2nd Street.",
  "workplace.searchUse": "Usar este cruce",
  "workplace.notFound": "No hay un cruce con ese nombre en la zona.",
  "workplace.pick": "Elegir en el mapa",
  "workplace.current": "Lugar de trabajo: {label}",
  "workplace.outside":
    "Ese punto está fuera de la zona. Elige un lugar dentro del contorno.",
  "workplace.pinned": "Ubicación marcada",

  "commute.title": "¿Qué tan lejos irías?",
  "commute.maxLabel": "Trayecto más largo",
  "commute.maxValue": "{n} minutos",
  "commute.shorter": "5 minutos menos",
  "commute.longer": "5 minutos más",
  "commute.mode": "Cómo llegarás",
  "commute.walk": "Solo a pie",
  "commute.muni": "A pie + Muni",
  "commute.muniHint":
    "Los tiempos en Muni usan el horario de las mañanas entre semana y cuentan como espera la mitad del tiempo entre salidas.",
  "commute.speed": "Ritmo al caminar",
  "commute.speedRelaxed": "Tranquilo",
  "commute.speedEasy": "Suave",
  "commute.speedTypical": "Normal",
  "commute.speedBrisk": "Rápido",
  "commute.speedHint":
    "Normal es 1.3 m/s, el ritmo habitual de adultos menores de 60 años. Incluye las subidas.",
  "commute.loading": "Calculando tiempos de trayecto…",
  "commute.error": "No se pudieron calcular los tiempos de trayecto.",
  "commute.reach": "Cuadras dentro de tu límite",
  "commute.reachValue": "{n} de {total}",
  "commute.workplace": "Lugar de trabajo",
  "commute.change": "Cambiar lugar de trabajo",

  "budget.title": "¿Cuánto puedes gastar?",
  "budget.salary": "Tu salario bruto anual",
  "budget.salaryHint": "Antes de impuestos. Se queda en este dispositivo.",
  "budget.roommates": "Compañeros de cuarto",
  "budget.roommatesNone": "Ninguno",
  "budget.roommateSalary": "Salario anual del compañero {n}",
  "budget.roommateHint": "Déjalo vacío para suponer que gana lo mismo que tú.",
  "budget.utilities": "Servicios mensuales de toda la unidad",
  "budget.utilitiesHint":
    "Luz, gas, agua, basura e internet. Promedia tus últimas facturas.",
  "budget.unitType": "Tipo de unidad",
  "budget.ceilingTitle": "Tu tope de renta",
  "budget.need": "Escribe tu salario para ver la renta que permite.",
  "budget.you": "Tú, al 30%",
  "budget.household": "Hogar, al 30%",
  "budget.afterUtilities": "Después de {amount} de servicios",
  "budget.conservative": "Al 25%",
  "budget.severe": "Al 50%, carga severa",
  "budget.residual":
    "Después de tu parte de la renta mediana ({unit}) y los servicios, te quedan {amount} de sueldo bruto al mes.",
  "budget.baselines": "Renta mediana anunciada, San Francisco",
  "budget.colUnit": "Unidad",
  "budget.colMedian": "Mediana",
  "budget.colYours": "Tu parte",
  "budget.colShare": "De tu sueldo",
  "budget.colSalary": "Salario para el 30%",
  "budget.sources":
    "Fuentes: {a}, {dateA}; {b}, {dateB}. Rentas anunciadas de unidades disponibles hoy, sin servicios.",
  "budget.overAll":
    "El tope del 30% para tu salario es {ceiling} al mes. La mediana de una recámara es {oneBed}. Dos recámaras compartidas cuestan {shared} por persona.",
  "budget.addRoommate": "Agregar un compañero",
  "budget.widen": "Ampliar el trayecto",
  "budget.assumption":
    "A los compañeros sin salario se les supone el mismo ingreso que el tuyo.",
  "budget.about":
    "HUD considera con carga de costos a quien paga más del 30% de su ingreso bruto en renta y servicios, y con carga severa a quien paga más del 50%. El 30% es una convención de política pública, por eso también se muestra lo que queda después de la renta.",

  "standing.within": "Dentro del 30%",
  "standing.near": "Cerca del 30%",
  "standing.over": "Más del 30%",
  "standing.unknown": "Agrega tu salario",

  "privacy.remember": "Recordar en este dispositivo",
  "privacy.rememberHint":
    "Apagado: tus datos se borran al cerrar esta pestaña. Encendido: se quedan en este navegador hasta que los borres.",

  "tabs.label": "Secciones",
  "tabs.commute": "Trayecto",
  "tabs.budget": "Presupuesto",
  "tabs.preferences": "Imprescindibles",
  "tabs.listings": "Anuncios",
  "tabs.areas": "Zonas",
  "tabs.settings": "Ajustes",

  "dock.expand": "Expandir panel",
  "dock.collapse": "Contraer panel",
  "dock.dataAsOf": "Datos al {date}",

  "rail.show": "Mostrar capas del mapa",
  "rail.hide": "Ocultar capas del mapa",

  "banner.stale":
    "Estos datos tienen {days} días. Las rentas y los reportes pueden haber cambiado.",
  "banner.storage":
    "Este navegador bloquea el almacenamiento, así que tus datos se perderán al salir.",
  "banner.dismiss": "Descartar",

  "pick.workplace": "Haz clic o toca el mapa para fijar tu lugar de trabajo.",
  "pick.listing": "Haz clic o toca el mapa para ubicar este anuncio.",

  "live.reachable": "{n} cuadras a {max} minutos o menos.",

  "map.label": "Mapa",
  "map.summary":
    "Mapa con {n} cuadras a {max} minutos o menos de {place}. La misma información está en la pestaña Zonas.",
  "map.noWebgl":
    "El mapa necesita WebGL, que este navegador tiene desactivado. Todo lo del mapa también está en la pestaña Zonas.",
  "map.loadError":
    "No se pudo cargar el mapa. Todo lo del mapa también está en la pestaña Zonas.",
  "area.error": "No se pudieron cargar los datos de la zona.",

  "layers.title": "Capas del mapa",
  "layers.shade": "Sombrear cuadras por",
  "layers.shadeCommute": "Tiempo de trayecto",
  "layers.shadeViolent": "Incidentes violentos",
  "layers.shadeProperty": "Incidentes contra la propiedad",
  "layers.danger": "Zonas de peligro",
  "layers.dangerHint":
    "Cuadras en el 10% más alto de la zona por incidentes violentos reportados en los últimos 12 meses.",
  "layers.encampment": "Reportes de campamentos",
  "layers.encampmentHint":
    "Reportes al 311 de los últimos 90 días. Son reportes, no un conteo de personas.",
  "layers.methods": "Cómo se calcula",

  "legend.title": "Leyenda",
  "legend.commute": "Minutos al trabajo",
  "legend.over": "Más de {max} minutos: sin sombrear.",
  "legend.violent": "Incidentes violentos por cuadra, 12 meses",
  "legend.property": "Incidentes contra la propiedad por cuadra, 12 meses",
  "legend.none": "Ninguno",
  "legend.range": "{a} a {b}",
  "legend.single": "{a}",
  "legend.plus": "{a}+",
  "legend.outside": "Las cuadras fuera de tu límite se ven atenuadas.",
  "legend.danger": "Zona de peligro",
  "legend.encampment": "Reportes de campamentos",

  "cell.title": "Cuadra seleccionada",
  "cell.near": "En {hood}",
  "cell.walk": "A pie al trabajo",
  "cell.muni": "A pie + Muni",
  "cell.violent": "Incidentes violentos, 12 meses",
  "cell.property": "Incidentes contra la propiedad, 12 meses",
  "cell.encampment": "Reportes de campamentos, 90 días",
  "cell.reported": "{n} reportados",
  "cell.danger":
    "Zona de peligro: 10% más alto de la zona en incidentes violentos.",
  "cell.rent": "Mediana de la ciudad para {unit}: {amount}",
  "cell.close": "Cerrar detalles de la cuadra",

  "prefs.title": "Imprescindibles y concesiones",
  "prefs.intro":
    "Clasifica cada característica. Los imprescindibles aceptan o descartan anuncios. Lo deseable recibe un valor mensual en dólares que se resta del costo de un anuncio que lo tenga.",
  "prefs.count": "{n} de {max} imprescindibles",
  "prefs.full":
    "Ya tienes {max} imprescindibles. Quita uno antes de agregar otro; una lista corta deja más anuncios en juego.",
  "prefs.must": "Imprescindible",
  "prefs.nice": "Deseable",
  "prefs.without": "Puedo prescindir",
  "prefs.value": "Lo que vale para ti al mes",
  "prefs.summaryMust": "Imprescindibles: {list}",
  "prefs.summaryNice": "Deseables: {list}",
  "prefs.none": "ninguno todavía",

  "feature.laundry": "Lavadora en la unidad",
  "feature.dishwasher": "Lavavajillas",
  "feature.outdoor": "Espacio exterior",
  "feature.elevator": "Elevador",
  "feature.parking": "Estacionamiento",
  "feature.pets": "Se permiten mascotas",
  "feature.gym": "Gimnasio",
  "feature.doorman": "Portero o recepción",
  "feature.rentControl": "Control de renta",
  "feature.light": "Luz natural",
  "feature.secondBath": "Segundo baño",
  "feature.quiet": "Calle tranquila",

  "listings.title": "Anuncios que has visitado",
  "listings.empty": "Agrega el primer anuncio que visitaste",
  "listings.emptyBody":
    "Escribe su renta y cuotas para comparar el costo mensual real, tu parte y la caminata al trabajo.",
  "listings.add": "Agregar un anuncio",
  "listings.print": "Imprimir o guardar como PDF",
  "listings.hideSalary": "Ocultar datos de sueldo al imprimir",
  "listings.rank": "Lugar {n}",
  "listings.allIn": "Total mensual",
  "listings.yourShare": "Tu parte",
  "listings.ofPay": "De tu sueldo",
  "listings.adjusted": "Después de lo deseable",
  "listings.walk": "A pie al trabajo",
  "listings.muni": "A pie + Muni",
  "listings.violent": "Incidentes violentos en su cuadra",
  "listings.missing": "Falta: {list}",
  "listings.allMet": "Cumple todos los imprescindibles",
  "listings.noLocation": "Sin ubicación",
  "listings.outside": "Fuera de la zona",
  "listings.confirmRemove": "¿Quitar {address}?",
  "listings.untitled": "Anuncio sin nombre",
  "listings.showOnMap": "Mostrar en el mapa",

  "form.titleNew": "Nuevo anuncio",
  "form.titleEdit": "Editar anuncio",
  "form.address": "Dirección o nombre",
  "form.addressHint": "Solo como referencia. No se busca en ningún lado.",
  "form.location": "Ubicación",
  "form.locationSet": "Marcada en el mapa",
  "form.locationNone": "Sin marcar",
  "form.pick": "Elegir en el mapa",
  "form.intersection": "Cruce más cercano",
  "form.baseRent": "Renta base al mes",
  "form.utilities": "Servicios al mes",
  "form.parking": "Estacionamiento al mes",
  "form.fees": "Otras cuotas obligatorias al mes",
  "form.concession": "Promoción de mudanza, total único",
  "form.concessionHint":
    "Por ejemplo, 6 semanas gratis en una unidad de $4,000 son unos $5,538. Se reparte en 12 meses.",
  "form.features": "Lo que tiene",
  "form.notes": "Notas",
  "form.needRent": "Escribe la renta base.",

  "areas.title": "Vecindarios",
  "areas.intro":
    "Todo lo que muestra el mapa, en una tabla. Ordena por cualquier columna.",
  "areas.colName": "Vecindario",
  "areas.colReach": "Cuadras a tu alcance",
  "areas.colWalk": "A pie, más rápido y típico",
  "areas.colMuni": "A pie + Muni, más rápido",
  "areas.colViolent": "Violentos, 12 meses",
  "areas.colProperty": "Propiedad, 12 meses",
  "areas.colEncampment": "Reportes de campamentos, 90 días",
  "areas.colDanger": "Cuadras de peligro",
  "areas.reachOf": "{n} de {total}",
  "areas.walkRange": "{a} / {b}",
  "areas.show": "Mostrar {name} en el mapa",
  "areas.note":
    "Los incidentes son reportes a la policía (SFPD), ubicados en el cruce más cercano. Las zonas más concurridas tienen más gente y más reportes.",

  "settings.title": "Ajustes",
  "settings.language": "Idioma",
  "settings.appearance": "Apariencia",
  "appearance.system": "Sistema",
  "appearance.light": "Clara",
  "appearance.dark": "Oscura",
  "settings.privacy": "Privacidad y almacenamiento",
  "settings.lock": "Proteger con frase de contraseña",
  "settings.lockHint":
    "Cifra lo que se guarda en este dispositivo. Si olvidas la frase, no se pueden recuperar los datos guardados.",
  "settings.passphrase": "Frase de contraseña",
  "settings.setLock": "Fijar frase",
  "settings.removeLock": "Quitar frase",
  "settings.locked": "Los datos guardados en este dispositivo están cifrados.",
  "settings.lockNeedsRemember":
    "Activa Recordar en este dispositivo para usar una frase de contraseña.",
  "settings.share": "Enlace para compartir",
  "settings.shareHint":
    "El enlace guarda tus elecciones después del signo #, que los navegadores nunca envían a un servidor.",
  "settings.shareBudget": "Incluir salario y anuncios",
  "settings.shareLabel": "Enlace a estos ajustes",
  "settings.copy": "Copiar enlace",
  "settings.copied": "Enlace copiado.",
  "settings.copyFailed": "No se pudo copiar. Selecciona el enlace y cópialo.",
  "settings.data": "Tus datos",
  "settings.export": "Exportar como JSON",
  "settings.import": "Importar desde JSON",
  "settings.imported": "Importado.",
  "settings.importFailed": "No se pudo leer ese archivo.",
  "settings.delete": "Borrar todos los datos",
  "settings.confirmDelete":
    "¿Borrar todo lo que escribiste en este dispositivo? No se puede deshacer.",
  "settings.about": "Código abierto con licencia MIT.",

  "unlock.title": "Desbloquea tu búsqueda guardada",
  "unlock.body": "Tus datos guardados están cifrados en este dispositivo.",
  "unlock.passphrase": "Frase de contraseña",
  "unlock.submit": "Desbloquear",
  "unlock.working": "Desbloqueando…",
  "unlock.wrong": "Esa frase no funcionó.",
  "unlock.fresh": "Empezar de nuevo",
  "unlock.freshConfirm": "¿Borrar los datos cifrados y empezar de nuevo?",

  "methods.title": "Cómo se calcula",
  "methods.walkTitle": "Tiempos a pie",
  "methods.walkBody":
    "Las calles y senderos vienen de OpenStreetMap. Cada tramo se pondera por su pendiente con la función de senderismo de Tobler y la elevación del programa 3D Elevation del USGS, así que subir toma más que bajar el mismo tramo. El ritmo normal es 1.3 m/s, dentro del rango de 1.2 a 1.4 m/s de adultos menores de 60 años (Bohannon y Andrews, 2011). Los tiempos se calculan en tu navegador, desde el centro de cada cuadra.",
  "methods.areaBody":
    "La zona cubre cada cuadra a menos de 45 minutos a pie de 350 Bush St.",
  "methods.muniTitle": "Tiempos a pie + Muni",
  "methods.muniBody":
    "El horario publicado de Muni (SFMTA GTFS, día de muestra {date}, de 6 a 10 a. m.) da los tiempos de viaje típicos. La espera cuenta como la mitad del tiempo entre salidas, con un máximo de 15 minutos, más un minuto para abordar. Los viajes pueden incluir un transbordo. No se modelan retrasos ni aglomeraciones.",
  "methods.incidentTitle": "Incidentes reportados",
  "methods.incidentBody":
    "Reportes de incidentes del SFPD publicados por DataSF, del {from} al {to}. Violentos: agresión, robo, homicidio, violación, delitos sexuales y trata de personas. Contra la propiedad: hurto, robo en vivienda o negocio, robo de vehículos, vandalismo, daños y incendio provocado. Cada incidente cuenta una vez por grupo. El SFPD ubica los incidentes en el cruce más cercano y omite algunos reportes confidenciales y de menores. A nivel nacional, cerca de la mitad de las victimizaciones violentas se reportan a la policía (BJS, 2025).",
  "methods.bandsBody":
    "Las cuadras sin reportes tienen el tono más claro. El resto se divide en cuatro grupos iguales según el conteo.",
  "methods.dangerTitle": "Zonas de peligro",
  "methods.dangerBody":
    "Cuadras en el 10% más alto de esta zona por incidentes violentos reportados en los mismos 12 meses, marcadas con una línea punteada. Mide reportes; no califica al vecindario.",
  "methods.encampmentTitle": "Reportes de campamentos",
  "methods.encampmentBody":
    "Casos del 311 registrados como campamento del {from} al {to}, de DataSF. Cuentan reportes hechos por el público, así que reflejan quién reporta además de dónde hay campamentos. El conteo preliminar Point-in-Time 2026 de la ciudad encontró 7,973 personas sin hogar en toda la ciudad, 3,400 de ellas sin refugio.",
  "methods.rentTitle": "Rentas de referencia",
  "methods.rentBody":
    "Rentas medianas anunciadas en toda la ciudad, de Zumper ({zumper}) y PadMapper ({padmapper}). Son precios de unidades disponibles hoy, que suelen superar lo que pagan los inquilinos actuales. Ambas fuentes agrupan las unidades de dos recámaras sin importar el número de baños.",
  "methods.budgetTitle": "Asequibilidad",
  "methods.budgetBody":
    "El tope es una parte del sueldo bruto mensual menos tu parte de los servicios: 25% conservador, 30% estándar y 50% carga severa, según las definiciones de carga de costos de HUD. Los estudios relacionan una carga alta de renta con peor salud autorreportada y atención médica pospuesta (Pollack et al., 2010; Meltzer y Schwartz, 2016).",
  "methods.privacyTitle": "Privacidad",
  "methods.privacyBody":
    "Todo lo que escribes se queda en este navegador. El mapa, los datos, las fuentes y el código se sirven solo desde este sitio, y la política de seguridad de la página bloquea solicitudes a cualquier otro lugar. No hay cuentas, cookies ni analítica.",
  "methods.sources": "Fuentes",
};
