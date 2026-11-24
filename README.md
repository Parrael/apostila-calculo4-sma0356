# Apostila Web Interativa — Cálculo IV (SMA0356 · ICMC/USP)

Material de estudo interativo completo, **do zero ao nível de prova (P2)**, estruturado segundo as Notas de Aula da **Profa. Dra. Janete Crema Simal** para a disciplina **SMA0356 (Cálculo IV — ICMC/USP)**.

Funciona **100% localmente** diretamente no navegador (protocolo `file://`), sem precisar instalar nada nem rodar servidor.

---

## Como abrir no seu computador

### Opção 1 — Baixar o ZIP (mais simples)
1. Clique no botão verde **Code** no topo desta página e selecione **Download ZIP**.
2. Extraia a pasta no seu computador.
3. Dê um **duplo clique** no arquivo `index.html`.

### Opção 2 — Clonar com Git
```bash
git clone https://github.com/Parrael/apostila-calculo4-sma0356.git
```
Depois, abra `index.html` diretamente no navegador.

> **Observação:** A renderização das fórmulas matemáticas usa **KaTeX** via CDN, portanto é necessária conexão à internet apenas para carregar a fonte e o renderizador matemático (todos os gráficos, simuladores, resoluções e o controle de progresso rodam localmente no seu navegador).

---

## Estrutura da Apostila

| Arquivo | Conteúdo | Destaques Interativos |
| :--- | :--- | :--- |
| `index.html` | Painel inicial, mapa da P2 e barra de progresso global | Progresso salvo automaticamente no `localStorage` |
| `bloco0.html` | **Bloco 0 · Nivelamento Obrigatório** — Séries numéricas essenciais, Aulas 11–12 (Raio e Intervalo de Convergência) e Kit de Integrais & Trigonometria | Simuladores de Somas Parciais / Critério de Leibniz e Raio/Intervalo de Convergência |
| `bloco1.html` | **Bloco 1 · O Motor das Séries de Potências** — Aulas 13, 14 e 16 (Derivação/Integração termo a termo, Taylor/Maclaurin, 4 Séries Fundamentais e Fórmula de Euler) | Simulador em tempo real do Polinômio de Taylor $P_N(x)$ aproximando $\operatorname{sen} x$, $\cos x$, $e^x$ e $\ln(1+x)$ |
| `bloco2.html` | **Bloco 2 · Convergência, Erros, Binomiais e EDOs** — Aulas 15, 18 e 17 (Resto de Lagrange, erro alternado, $e^{-1/x^2}$, Séries Binomiais, EDOs via séries e Bessel $J_0$) | Simulador Dual (Integral Gaussiana $e^{-t^2}$ + Função de Bessel $J_0(x)$) |
| `bloco3.html` | **Bloco 3 · Fundamentos e Cálculos de Fourier** — Aulas 19, 20, 21 e 22 (Periodicidade, Ortogonalidade, Coeficientes, Teorema de Fourier nos saltos, Bessel, Parseval e Forma Complexa) | Simulador de Harmônicos de Fourier $S_N(x)$ com visualização da convergência para a média nos saltos e Fenômeno de Gibbs |
| `bloco4.html` | **Bloco 4 · Extensões Periódicas, Pares e Ímpares** — Aula 23 (Séries de Cossenos e Senos em $[0, L]$ e ponte para EDPs) | Seletor visual desenhando dinamicamente as extensões Periódica, Par e Ímpar em $[-2L, 2L]$ com sobreposição de Fourier |
| `bloco5.html` | **Bloco 5 · Aplicações em EDPs: Calor e Onda** — Aulas 24, 25, 26 e 27 (Separação de variáveis: Dirichlet Homogêneo, Não Homogêneo, Neumann/Barra Isolada e Corda Vibrante) | 2 Simuladores Temporais: Difusão de Calor (Dirichlet vs. Neumann + mapa térmico) e Corda Vibrante (harmônicos e frequência fundamental) |
| `formulario.html` | **Mapa de Sobrevivência da P2** — Formulário de bolso resumido com tabelas, checklists e Top 10 pegadinhas | Layout otimizado para impressão (`@media print` / Salvar como PDF) |

---

## Recursos Didáticos

- **Zero saltos algébricos:** todas as derivadas, integrais por partes (incluindo método tabular e cíclico), deslocamentos de índices em somatórios e simplificações de sinais $(-1)^n$ são mostrados passo a passo.
- **19 tópicos rastreáveis e 68 exercícios de fixação** com resoluções recolhíveis (*Ver Resolução Passo a Passo* ou revelação passo a passo).
- **Modo Claro e Modo Escuro** adaptando inclusive os gráficos em Canvas.
- **Totalmente estático:** HTML + CSS + JS puro (sem build, sem ES modules, sem `fetch`).
