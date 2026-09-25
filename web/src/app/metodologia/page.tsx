import { MethodologyCatalog } from "@/components/methodology/MethodologyCatalog";
import { methodologyQueries } from "@/lib/pageQueries";
import { PrefetchedQueries } from "@/lib/prefetch";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Metodología y fuentes - La Brecha",
  description:
    "De dónde sale cada indicador, con qué cadencia se actualiza, cómo se calcula cada brecha entre fuentes y cómo se recorta una serie por gestión de gobierno.",
  alternates: { canonical: "/metodologia" },
};

const MONO = "var(--font-jb-mono)";

function Rule({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ borderTop: "1px solid var(--line)", paddingTop: 18 }}>
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "1.0625rem",
          color: "var(--ink)",
          margin: "0 0 8px",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "0.9375rem",
          lineHeight: 1.6,
          color: "var(--ink2)",
          margin: 0,
        }}
      >
        {children}
      </p>
    </div>
  );
}

export default function MethodologyPage() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 72px" }}>
      <header style={{ borderBottom: "2px solid var(--ink)", paddingBottom: 22, marginBottom: 32 }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: "0.72rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--ink3)",
            marginBottom: 10,
          }}
        >
          /metodologia
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "clamp(2rem, 5vw, 2.875rem)",
            letterSpacing: "-0.025em",
            margin: "0 0 14px",
            color: "var(--ink)",
            textWrap: "balance",
          }}
        >
          Cómo se arma cada número
        </h1>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(1rem, 2.2vw, 1.1875rem)",
            lineHeight: 1.55,
            color: "var(--ink2)",
            margin: 0,
            maxWidth: 640,
          }}
        >
          Un observatorio sirve si se puede auditar. Acá está de dónde sale cada serie, cada cuánto se
          actualiza, cómo se calculan las brechas y qué límites tienen los datos.
        </p>
      </header>

      <section style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 52 }}>
        <Rule title="Ningún dato se muestra sin fuente y fecha">
          Es la regla dura del proyecto. Cada valor del sitio se publica junto con la fuente que lo midió y la
          fecha a la que corresponde. Si un dato está viejo, se muestra viejo con su fecha: nunca se completa
          ni se estima en silencio.
        </Rule>
        <Rule title="La brecha entre fuentes se calcula sobre la misma fecha">
          Cuando dos fuentes publican el mismo indicador, se busca la fecha más reciente en la que las dos
          midieron, y se comparan esos valores. La discrepancia se expresa como cuánto más alto está el valor
          mayor respecto del menor. Comparar el último dato de cada fuente sin alinear fechas mezclaría
          cadencias distintas y exageraría la brecha.
        </Rule>
        <Rule title="Las brechas curadas comparan indicadores distintos">
          La brecha cambiaria (blue contra oficial) o la inflación esperada contra la medida no son la misma
          serie medida dos veces: son dos indicadores que tiene sentido enfrentar. Esas están definidas a
          mano. Las que salen solas de los datos aparecen por separado.
        </Rule>
        <Rule title="Por gestión: se compone, no se suma">
          En las series que son tasas mensuales, como la inflación, la variación de un mandato se calcula
          componiendo mes a mes, no sumando los porcentajes. En las series de nivel, como las reservas, se
          compara el primer dato con el último dentro del período. Cada tabla aclara cuál de los dos métodos
          usó.
        </Rule>
        <Rule title="Los mandatos se recortan a los datos que existen">
          Un período de gobierno se muestra desde el primer dato disponible dentro del mandato, que puede ser
          posterior a la asunción, hasta el último. Por eso las fechas de cada fila no siempre coinciden con
          las de la asunción y la entrega.
        </Rule>
        <Rule title="El histórico oficial tiene un agujero conocido">
          Entre 2007 y 2015 el INDEC estuvo intervenido y sus índices de precios fueron cuestionados. Las
          series que provienen de estadísticas oficiales de ese período reflejan esa medición, no una
          corrección nuestra. Mostrar la discrepancia entre mediciones, en vez de elegir una, es justamente el
          punto del sitio.
        </Rule>
        <Rule title="La brecha automática sólo compara la misma unidad">
          El ranking de discrepancias que sale solo de los datos exige que las dos mediciones declaren la
          misma unidad. Si una fuente publica en millones y otra en unidades, o si una no declara unidad,
          queda afuera de la comparación y se lista aparte con el motivo: una brecha de escala no es una
          brecha de medición.
        </Rule>
        <Rule title="Un hueco en la serie se dibuja como hueco">
          Cuando una fuente todavía no empezó a medir, o dejó de hacerlo, el gráfico corta la línea en vez de
          estirar el primer o el último valor conocido. La banda ámbar de brecha sólo se pinta donde las dos
          fuentes midieron de verdad. Un dato mensual sí se mantiene vigente hasta la medición siguiente, que
          es lo que significa una serie mensual.
        </Rule>
        <Rule title="Hay series que calculamos nosotros">
          Algunas series no las publica nadie: las derivamos de otras dos que sí son oficiales y las marcamos
          con la fuente <b>La Brecha (calculado)</b>. El salario mínimo y la jubilación mínima a precios
          constantes se deflactan por el IPC nivel general contra un <b>mes base fijo</b>, elegido en el
          código y publicado en cada gráfico ("pesos de …"): con base móvil, cada corrida reescribía toda la
          serie y un CSV descargado el mes pasado dejaba de coincidir con el de hoy. El dólar de
          convertibilidad es la base monetaria dividida por las reservas, ambas del BCRA, tomando el último
          dato de reservas anterior o igual a la fecha de la base monetaria —las dos series se publican con
          cadencias distintas— y su metadata guarda qué día de reservas se usó.
        </Rule>
        <Rule title="Las reservas netas no están porque nadie las publica">
          El BCRA publica reservas brutas. Las netas —descontando el swap con China, los encajes en dólares y
          los repos— son una estimación de analistas, no una serie oficial, y cada consultora usa un criterio
          distinto. Preferimos no inventar un número antes que publicar una estimación propia disfrazada de
          dato.
        </Rule>
        <Rule title="El pipeline se puede auditar">
          Cada corrida de cada conector queda registrada con su estado, las filas que ingirió y el error si
          falló. Está publicado en <b>/estado</b>: si una serie se congeló, se ve ahí. Una corrida que termina
          sin excepción pero no trae filas no cuenta como exitosa: se marca <b>sin datos</b> en ámbar y
          dispara la misma alerta que un error, porque un scraper mudo es indistinguible de un scraper roto.
        </Rule>
      </section>

      <section>
        <header style={{ marginBottom: 8 }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "clamp(1.5rem, 3.5vw, 2rem)",
              letterSpacing: "-0.02em",
              margin: "0 0 10px",
              color: "var(--ink)",
            }}
          >
            Indicador por indicador
          </h2>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1rem",
              lineHeight: 1.55,
              color: "var(--ink2)",
              margin: "0 0 28px",
              maxWidth: 620,
            }}
          >
            Cobertura real de cada serie, tomada de la base en este momento. El ◆ marca los indicadores que
            tienen más de una fuente y por lo tanto una brecha para comparar.
          </p>
        </header>
        <PrefetchedQueries queries={methodologyQueries()}>
          <MethodologyCatalog />
        </PrefetchedQueries>
      </section>
    </div>
  );
}
