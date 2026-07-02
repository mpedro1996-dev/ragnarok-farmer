# Design System â€” Template White-Label Mobile First

## 1) VisÃ£o geral do app

Este Design System foi pensado para um app **white-label**, com base **mobile-first**, visual neutro e fÃ¡cil de personalizar para diferentes marcas sem quebrar consistÃªncia visual.

### Objetivos

* Permitir troca de marca com impacto mÃ­nimo no produto
* Manter consistÃªncia entre telas, componentes e estados
* Priorizar legibilidade, contraste e velocidade de implementaÃ§Ã£o
* ComeÃ§ar pelo mobile e escalar para tablet e desktop

### PrincÃ­pios

* **SemÃ¢ntica antes de aparÃªncia**: a interface consome tokens semÃ¢nticos, nunca valores soltos
* **Base neutra + marca aplicÃ¡vel**: fundos e textos ficam estÃ¡veis; aÃ§Ãµes e destaques absorvem a marca
* **Componentes previsÃ­veis**: o mesmo componente sempre usa os mesmos tokens
* **Acessibilidade visÃ­vel**: foco, disabled e status sempre explÃ­citos

---

## 2) Paleta de cores (valores reais â†’ tokens)

Abaixo estÃ¡ a paleta base recomendada para o tema default do template. Em white-label, a troca principal deve acontecer nos tokens de aÃ§Ã£o e, se necessÃ¡rio, em `text-on-brand`.

### Texto

* `text-primary` â†’ `#111827`
* `text-secondary` â†’ `#4B5563`
* `text-muted` â†’ `#9CA3AF`
* `text-on-dark` â†’ `#F9FAFB`
* `text-on-brand` â†’ `#FFFFFF`

### SuperfÃ­cies

* `surface-page` â†’ `#F8FAFC`
* `surface-section` â†’ `#F1F5F9`
* `surface-card` â†’ `#FFFFFF`
* `surface-subtle` â†’ `#EEF2F7`
* `surface-elevated` â†’ `#FFFFFF`

### AÃ§Ãµes

* `action-primary` â†’ `#2563EB`
* `action-primary-hover` â†’ `#1D4ED8`
* `action-primary-active` â†’ `#1E40AF`
* `action-secondary` â†’ `#E5E7EB`
* `action-strong` â†’ `#0F172A`
* `action-strong-hover` â†’ `#020617`

### Bordas

* `border-default` â†’ `#D1D5DB`
* `border-subtle` â†’ `#E5E7EB`
* `border-focus` â†’ `#93C5FD`

### Status

* `status-success` â†’ `#16A34A`
* `status-warning` â†’ `#D97706`
* `status-error` â†’ `#DC2626`

### Regra de personalizaÃ§Ã£o white-label

Para cada nova marca:

* mantenha `surface-*`, `border-*` e a maior parte de `text-*` estÃ¡veis
* personalize primeiro `action-primary`, `action-primary-hover`, `action-primary-active`
* valide `text-on-brand` para contraste sobre a nova cor principal
* personalize `action-strong` apenas se o produto precisar de CTA premium ou mais institucional

---

## 3) Tokens de base para implementaÃ§Ã£o

### EspaÃ§amento

* `space-1`
* `space-2`
* `space-3`
* `space-4`
* `space-6`
* `space-8`
* `space-12`
* `space-16`
* `space-20`

### Tipografia

#### Tamanho

* `text-xs`
* `text-sm`
* `text-base`
* `text-lg`
* `text-xl`
* `text-2xl`
* `text-3xl`
* `text-4xl`
* `text-5xl`

#### Peso

* `font-normal`
* `font-medium`
* `font-semibold`
* `font-bold`

### Bordas e sombras

#### Radius

* `radius-sm`
* `radius-md`
* `radius-lg`
* `radius-xl`
* `radius-2xl`
* `radius-full`

#### Sombra

* `shadow-sm`
* `shadow-md`
* `shadow-lg`
* `shadow-card`
* `shadow-card-hover`
* `shadow-button-primary`

---

## 4) Estrutura visual mobile-first

### PÃ¡gina

* fundo: `surface-page`
* texto padrÃ£o: `text-primary`
* espaÃ§amento horizontal mobile: `space-4`
* espaÃ§amento entre blocos: `space-8`

### SeÃ§Ã£o

* fundo alternado: `surface-section`
* padding vertical padrÃ£o: `space-12`
* padding vertical expandido: `space-16`

### Card de conteÃºdo

* fundo: `surface-card`
* radius: `radius-xl`
* shadow: `shadow-card`
* padding interno: `space-6`

### Escala por viewport

#### Mobile

* layout em uma coluna
* aÃ§Ãµes principais sempre visÃ­veis
* cards empilhados
* formulÃ¡rios em fluxo vertical
* navegaÃ§Ã£o por bottom bar ou top bar compacta

#### Tablet e desktop

* manter os mesmos componentes
* aumentar respiro entre seÃ§Ãµes para `space-12` ou `space-16`
* permitir duas colunas apenas onde leitura e toque nÃ£o forem prejudicados
* manter CTAs usando os mesmos tokens de aÃ§Ã£o

---

## 5) Componentes documentados

## 5.1 BotÃµes

### Button / Primary

**Uso**: aÃ§Ã£o principal da tela, confirmaÃ§Ã£o, continuar, salvar

**Tokens**

* background: `action-primary`
* texto: `text-on-brand`
* radius: `radius-md`
* sombra: `shadow-button-primary`
* padding interno: `space-4`
* gap interno com Ã­cone: `space-2`
* tipografia: `text-base` + `font-semibold`

**Estados**

* Default: `action-primary`
* Hover: `action-primary-hover`
* Active: `action-primary-active`
* Focus: ring com `border-focus`
* Disabled: usar `surface-subtle`, texto `text-muted`, sem destaque visual forte

### Button / Secondary

**Uso**: aÃ§Ãµes de apoio, cancelar, voltar, editar

**Tokens**

* background: `surface-card`
* texto: `text-primary`
* borda: `border-default`
* radius: `radius-md`
* sombra: `shadow-sm`
* padding interno: `space-4`
* tipografia: `text-base` + `font-semibold`

**Estados**

* Default: `surface-card` + `border-default`
* Hover: `surface-subtle`
* Active: `action-secondary`
* Focus: ring com `border-focus`
* Disabled: fundo `surface-subtle`, texto `text-muted`, borda `border-subtle`

### Button / Strong (CTA)

**Uso**: conversÃ£o, assinatura, contratar, finalizar compra

**Tokens**

* background: `action-strong`
* texto: `text-on-dark`
* radius: `radius-md`
* sombra: `shadow-lg`
* padding interno: `space-4`
* tipografia: `text-base` + `font-semibold`

**Estados**

* Default: `action-strong`
* Hover: `action-strong-hover`
* Active: `action-strong-hover`
* Focus: ring com `border-focus`
* Disabled: fundo `surface-subtle`, texto `text-muted`

---

## 5.2 Cards

### Card / Default

**Uso**: agrupamento de informaÃ§Ã£o, resumo, lista, atalhos

**Tokens**

* background: `surface-card`
* radius: `radius-xl`
* shadow: `shadow-card`
* padding: `space-6`
* borda opcional: `border-subtle`

**Estados**

* Default: `shadow-card`
* Hover: `shadow-card-hover`
* Active: manter `surface-card` com reduÃ§Ã£o de elevaÃ§Ã£o visual
* Focus: borda ou ring com `border-focus`
* Disabled: usar `surface-subtle` + texto `text-muted`

### Card / Elevated

**Uso**: destaque, resumo financeiro, bloco promocional, widget prioritÃ¡rio

**Tokens**

* background: `surface-elevated`
* radius: `radius-xl`
* shadow: `shadow-md`
* padding: `space-6`

---

## 5.3 Inputs

### Input / Text

**Uso**: entrada padrÃ£o de texto

**Tokens**

* background: `surface-card`
* borda: `border-default`
* texto: `text-primary`
* placeholder: `text-muted`
* radius: `radius-sm`
* sombra: `shadow-sm`
* padding interno: `space-4`
* tipografia: `text-base` + `font-normal`

**Estados**

* Default: `border-default`
* Hover: manter base com reforÃ§o sutil de contraste
* Active: manter base
* Focus: `border-focus` com ring visÃ­vel
* Disabled: fundo `surface-subtle`, texto `text-muted`, borda `border-subtle`

### Input / Search

**Uso**: busca, filtro rÃ¡pido

**Tokens**

* base do campo: mesmos tokens do `Input / Text`
* Ã­cone: `text-secondary`
* fundo em contexto leve: `surface-subtle`

### Input / Error

**Uso**: campo invÃ¡lido

**Tokens**

* borda: `status-error`
* texto de ajuda: `status-error`
* fundo: `surface-card`

### Input / Success

**Uso**: feedback positivo ou validado

**Tokens**

* borda: `status-success`
* texto de ajuda: `status-success`

---

## 5.4 Select e dropdown

### Select / Default

**Uso**: seleÃ§Ã£o Ãºnica, filtros, preferÃªncias

**Tokens**

* background: `surface-card`
* borda: `border-default`
* texto: `text-primary`
* Ã­cone: `text-secondary`
* radius: `radius-sm`
* sombra do menu: `shadow-md`
* padding interno: `space-4`

**Estados**

* Default: `surface-card`
* Hover: `surface-subtle`
* Active: manter aberto sobre `surface-elevated`
* Focus: ring com `border-focus`
* Disabled: `surface-subtle` + `text-muted`

---

## 5.5 Textarea

### Textarea / Default

**Uso**: descriÃ§Ãµes longas, observaÃ§Ãµes, comentÃ¡rios

**Tokens**

* iguais ao `Input / Text`
* padding interno: `space-4`
* radius: `radius-sm`

**Estados**

* seguir os mesmos estados do input

---

## 5.6 Checkbox e radio

### Checkbox / Default

**Uso**: seleÃ§Ã£o mÃºltipla, consentimento, filtros

**Tokens**

* box default: `surface-card`
* borda: `border-default`
* marcado: `action-primary`
* Ã­cone marcado: `text-on-brand`
* label: `text-primary`
* ajuda: `text-secondary`
* gap entre controle e label: `space-3`

**Estados**

* Default: borda `border-default`
* Hover: fundo `surface-subtle`
* Active: marcado com `action-primary-active`
* Focus: ring com `border-focus`
* Disabled: box `surface-subtle`, label `text-muted`

**AplicaÃ§Ã£o em formulÃ¡rios administrativos**

* usar checkbox em linha Ãºnica quando o campo representar um booleano simples de cadastro
* manter controle e texto alinhados horizontalmente, com helper text logo abaixo do label
* para o CRUD de itens, usar o label `Venda para NPC`
* defaults booleanos de cadastro devem iniciar desmarcados quando o valor inicial de negÃ³cio for `false`

### Radio / Default

**Uso**: seleÃ§Ã£o Ãºnica

**Tokens**

* seguir os mesmos princÃ­pios do checkbox

---

## 5.7 Switch

### Switch / Default

**Uso**: ativar ou desativar configuraÃ§Ã£o

**Tokens**

* trilho desligado: `action-secondary`
* trilho ligado: `action-primary`
* knob: `surface-card`
* label: `text-primary`

**Estados**

* Default off: `action-secondary`
* Default on: `action-primary`
* Hover: usar versÃ£o com mais contraste do estado atual
* Active: usar versÃ£o pressed do estado ligado
* Focus: ring com `border-focus`
* Disabled: trilho `surface-subtle`, label `text-muted`

---

## 5.8 Tabs

### Tabs / Navigation

**Uso**: alternar conteÃºdo em uma mesma tela

**Tokens**

* container: `surface-subtle`
* item default: texto `text-secondary`
* item ativo: `surface-card` + `text-primary`
* radius do container: `radius-full`
* radius do item: `radius-full`
* padding interno: `space-2`
* padding do item: `space-3`

**Estados**

* Default: texto `text-secondary`
* Hover: `surface-card`
* Active: item selecionado
* Focus: ring com `border-focus`
* Disabled: `text-muted`

---

## 5.9 Chips e filtros rÃ¡pidos

### Chip / Filter

**Uso**: filtros, tags de seleÃ§Ã£o, estados curtos

**Tokens**

* fundo default: `surface-subtle`
* texto default: `text-secondary`
* fundo selecionado: `action-primary`
* texto selecionado: `text-on-brand`
* radius: `radius-full`
* padding: `space-2` e `space-3`
* tipografia: `text-sm` + `font-medium`

**Estados**

* Default: `surface-subtle`
* Hover: `surface-card`
* Active: selecionado com `action-primary-active`
* Focus: ring com `border-focus`
* Disabled: `surface-subtle` + `text-muted`

---

## 5.10 Top bar

### Top Bar / App Header

**Uso**: tÃ­tulo, aÃ§Ã£o de voltar, aÃ§Ã£o contextual

**Tokens**

* fundo: `surface-page` ou `surface-card`
* tÃ­tulo: `text-xl` + `font-semibold` + `text-primary`
* subtÃ­tulo opcional: `text-sm` + `text-secondary`
* Ã¡rea interna: `space-4`
* borda inferior opcional: `border-subtle`

**Estados**

* botÃµes internos seguem os estados de botÃ£o secundÃ¡rio ou Ã­cone

---

## 5.11 Bottom navigation

### Bottom Nav / Primary

**Uso**: navegaÃ§Ã£o principal mobile

**Tokens**

* fundo: `surface-elevated`
* borda superior: `border-subtle`
* item default: `text-muted`
* item ativo: `action-primary`
* label: `text-xs` + `font-medium`
* padding vertical: `space-3`

**Estados**

* Default: `text-muted`
* Hover: `text-secondary`
* Active: `action-primary`
* Focus: ring com `border-focus`
* Disabled: `text-muted`

---

## 5.12 List item

### List Item / Default

**Uso**: listas de pedidos, usuÃ¡rios, notificaÃ§Ãµes, configuraÃ§Ãµes

**Tokens**

* fundo: `surface-card`
* tÃ­tulo: `text-base` + `font-medium` + `text-primary`
* descriÃ§Ã£o: `text-sm` + `text-secondary`
* meta: `text-xs` + `text-muted`
* separador: `border-subtle`
* padding: `space-4`
* gap interno: `space-3`

**Estados**

* Default: `surface-card`
* Hover: `surface-subtle`
* Active: manter legibilidade com feedback de superfÃ­cie
* Focus: ring com `border-focus`
* Disabled: texto `text-muted`

---

## 5.13 Banner de status

### Banner / Success

* fundo: `surface-subtle`
* tÃ­tulo e Ã­cone: `status-success`
* texto complementar: `text-secondary`
* radius: `radius-lg`
* padding: `space-4`

### Banner / Warning

* fundo: `surface-subtle`
* tÃ­tulo e Ã­cone: `status-warning`
* texto complementar: `text-secondary`

### Banner / Error

* fundo: `surface-subtle`
* tÃ­tulo e Ã­cone: `status-error`
* texto complementar: `text-secondary`

---

## 5.14 Modal e bottom sheet

### Modal / Default

**Uso**: confirmaÃ§Ã£o, escolha rÃ¡pida, formulÃ¡rio curto

**Tokens**

* fundo do conteÃºdo: `surface-elevated`
* radius: `radius-2xl`
* shadow: `shadow-lg`
* padding interno: `space-6`
* tÃ­tulo: `text-2xl` + `font-semibold` + `text-primary`
* corpo: `text-base` + `text-secondary`

**Estados**

* botÃµes internos seguem seus padrÃµes
* foco inicial deve ser visÃ­vel com `border-focus`

### Bottom Sheet / Mobile

**Uso**: aÃ§Ãµes contextuais, filtros, seleÃ§Ã£o rÃ¡pida

**Tokens**

* fundo: `surface-elevated`
* radius superior: `radius-2xl`
* shadow: `shadow-lg`
* padding: `space-6`

---

## 5.15 Empty state

### Empty State / Default

**Uso**: ausÃªncia de dados, primeira experiÃªncia, busca sem resultado

**Tokens**

* fundo opcional: `surface-card`
* tÃ­tulo: `text-xl` + `font-semibold` + `text-primary`
* descriÃ§Ã£o: `text-base` + `text-secondary`
* apoio: `text-sm` + `text-muted`
* aÃ§Ã£o principal: Button / Primary
* spacing entre elementos: `space-4` ou `space-6`

---

## 5.16 Loading state

### Skeleton / Default

**Uso**: carregamento de listas, cards, detalhes

**Tokens**

* bloco base: `surface-subtle`
* bloco destacado: `surface-section`
* radius: `radius-md` ou `radius-lg`

> Como nÃ£o existe token especÃ­fico de animaÃ§Ã£o, o skeleton deve usar apenas superfÃ­cies jÃ¡ definidas.

---

## 5.17 Tabela

### Table / Default

**Uso**: listagem de dados administrativos, relatÃ³rios resumidos, pedidos, usuÃ¡rios, pagamentos, histÃ³ricos e comparaÃ§Ãµes rÃ¡pidas.

**Tokens**

* container: `surface-card`
* fundo do cabeÃ§alho: `surface-section`
* fundo da linha padrÃ£o: `surface-card`
* fundo da linha alternada: `surface-subtle`
* texto principal: `text-primary`
* texto secundÃ¡rio: `text-secondary`
* texto de apoio: `text-muted`
* borda horizontal: `border-subtle`
* borda externa opcional: `border-subtle`
* radius do container: `radius-xl`
* shadow do container: `shadow-card`
* padding das cÃ©lulas: `space-4`
* tipografia do cabeÃ§alho: `text-sm` + `font-semibold`
* tipografia do conteÃºdo: `text-sm` ou `text-base` + `font-normal`

**Estrutura**

* a tabela deve ficar dentro de um container com `surface-card`
* o cabeÃ§alho deve usar `surface-section`
* linhas devem priorizar legibilidade, com separaÃ§Ã£o por `border-subtle`
* quando necessÃ¡rio, aplicar zebra usando `surface-card` e `surface-subtle`
* em mobile, a tabela deve permitir rolagem horizontal em vez de quebrar colunas de forma inconsistente

**Estados**

* Default: linhas com `surface-card`
* Hover: destacar linha com `surface-subtle`
* Active: manter leitura clara com reforÃ§o de contraste suave
* Focus: ring visÃ­vel com `border-focus` no container ou cÃ©lula interativa
* Selected: usar destaque leve de superfÃ­cie e reforÃ§o de texto
* Disabled: texto `text-muted`, aÃ§Ãµes desabilitadas e menor destaque visual

**VariaÃ§Ãµes**

* `Table / Compact`: para tabelas densas, com menor respiro vertical
* `Table / With Actions`: Ãºltima coluna com aÃ§Ãµes como editar, visualizar ou remover
* `Table / Status`: colunas com chips ou badges usando tokens de status
* `Table / Empty`: quando nÃ£o houver dados, exibir `Empty State / Default` no lugar da grade
* `Table / Totals Footer`: rodapÃ© com linha consolidada para totalizadores financeiros ou operacionais

**Boas prÃ¡ticas mobile-first**

* priorizar no mÃ¡ximo 4 ou 5 colunas visÃ­veis de alto valor
* mover informaÃ§Ãµes secundÃ¡rias para expansÃ£o da linha, detalhe ou modal
* usar rolagem horizontal quando a comparaÃ§Ã£o entre colunas for indispensÃ¡vel
* evitar aÃ§Ãµes muito pequenas; manter Ã¡rea de toque confortÃ¡vel
* nÃ£o depender apenas de cor para diferenciar status

### Table / Totals Footer

**Uso**: consolidar totais no rodapÃ© de tabelas de relatÃ³rio, especialmente somas de quantidade, zenny e colunas financeiras derivadas.

**Tokens**

* fundo do rodapÃ©: `surface-section`
* borda superior: `border-subtle`
* texto principal: `text-primary`
* texto secundÃ¡rio: `text-secondary`
* peso do rÃ³tulo: `font-semibold`

**Estrutura**

* usar uma linha final fixa com o rÃ³tulo `Total geral`
* manter alinhamento idÃªntico ao das colunas acima
* totais numÃ©ricos devem ter contraste maior que o corpo da tabela
* quando uma coluna permitir `-` nas linhas, o rodapÃ© deve exibir `0` se a soma consolidada for nula

---

## 5.18 Tooltip

### Tooltip / Rich List

**Uso**: detalhar conteÃºdo complementar sem expandir a linha da tabela, especialmente listas curtas de itens, recompensas, vÃ­nculos ou metadados visuais.

**Tokens**

* fundo: `surface-elevated`
* borda: `border-subtle`
* sombra: `shadow-lg`
* radius: `radius-lg`
* tÃ­tulo do gatilho: `text-sm` ou `text-base` + `font-semibold` + `text-primary`
* texto interno: `text-sm` + `text-secondary`
* tÃ­tulo interno opcional: `text-xs` + `font-semibold` + `text-muted`
* padding interno: `space-4`
* gap entre itens: `space-3`
* largura recomendada: entre `220px` e `320px`

**Estrutura**

* o gatilho deve manter a hierarquia visual original da tabela ou lista
* o tooltip deve abrir sobre a interface, sem deslocar layout
* o tooltip deve ser renderizado em camada flutuante acima do conteÃºdo, sem expandir containers com `overflow`, tabelas ou Ã¡reas rolÃ¡veis
* para listas de itens, cada linha deve mostrar Ã­cone e nome
* se nÃ£o houver conteÃºdo relacionado, o gatilho nÃ£o deve abrir tooltip vazio
* em contextos com teclado, o tooltip deve abrir em `focus-visible` alÃ©m de hover

**Estados**

* Default: oculto, sem competir com o conteÃºdo principal
* Hover: tooltip visÃ­vel com sombra e contraste suficiente
* Focus: tooltip visÃ­vel e gatilho com ring usando `border-focus`
* Disabled: nÃ£o aplicar quando o gatilho nÃ£o for interativo

**Boas prÃ¡ticas**

* usar tooltip apenas para conteÃºdo curto e escaneÃ¡vel
* evitar aÃ§Ãµes primÃ¡rias dentro do tooltip
* limitar a quantidade visÃ­vel e permitir rolagem interna quando a lista crescer
* em mobile, substituir hover por outra representaÃ§Ã£o visÃ­vel no layout quando necessÃ¡rio

---

## 6) Estados obrigatÃ³rios por componente interativo

Todo componente interativo deve implementar os estados abaixo:

### Default

* versÃ£o base do componente com tokens principais

### Hover

* reforÃ§o de contraste ou profundidade
* preferir mudanÃ§a de superfÃ­cie, sombra ou token de hover jÃ¡ existente

### Active / Pressed

* usar versÃ£o pressed da aÃ§Ã£o, ou reduzir elevaÃ§Ã£o visual sem quebrar contraste

### Focus

* ring visÃ­vel usando `border-focus`
* nunca remover foco visÃ­vel

### Disabled

* usar `text-muted`
* usar `surface-subtle` quando houver fundo
* usar `border-subtle` em vez de bordas fortes
* remover sinais de aÃ§Ã£o prioritÃ¡ria

---

## 7) Hierarquia tipogrÃ¡fica

### Headline principal

* `text-4xl` ou `text-5xl`
* `font-bold`
* cor: `text-primary`

### TÃ­tulo de seÃ§Ã£o

* `text-3xl`
* `font-bold`
* cor: `text-primary`

### TÃ­tulo de card

* `text-2xl`
* `font-semibold`
* cor: `text-primary`

### SubtÃ­tulo

* `text-xl`
* `font-semibold`
* cor: `text-primary`

### Corpo

* `text-base`
* `font-normal`
* cor: `text-secondary`

### Apoio e legenda

* `text-sm`
* `font-normal`
* cor: `text-secondary`

### Meta, badge e microcopy

* `text-xs`
* `font-medium`
* cor: `text-muted`

---

## 8) PadrÃ£o de layout por tipo de tela

### Login

* pÃ¡gina: `surface-page`
* card principal: `surface-card`, `radius-xl`, `shadow-card`, `space-6`
* tÃ­tulo: `text-3xl`, `font-bold`, `text-primary`
* descriÃ§Ã£o: `text-sm`, `text-secondary`
* campos empilhados com gap `space-4`
* CTA principal: Button / Primary
* aÃ§Ã£o de apoio: Button / Secondary ou link com `action-primary`

### Home / Dashboard

* pÃ¡gina: `surface-page`
* blocos entre si: `space-8`
* cards: padrÃ£o `Card / Default`
* atalhos: `Chip / Filter` ou `Card / Default`
* CTA prioritÃ¡rio: Button / Strong apenas quando houver aÃ§Ã£o de negÃ³cio relevante

### Lista

* container: `surface-page`
* filtros: `Chip / Filter` ou `Select / Default`
* itens: `List Item / Default`
* paginaÃ§Ã£o ou carregar mais: Button / Secondary

### Detalhe

* cabeÃ§alho com `Top Bar / App Header`
* blocos de informaÃ§Ã£o em `Card / Default`
* aÃ§Ãµes fixas ou finais com Button / Primary e Secondary

### FormulÃ¡rio

* fundo: `surface-page`
* grupos em `space-6`
* labels em `text-sm` + `font-medium` + `text-primary`
* ajuda em `text-xs` + `text-secondary`
* erro em `status-error`

### Tabela em contexto de lista administrativa

* pÃ¡gina: `surface-page`
* bloco da tabela: `surface-card`
* topo da seÃ§Ã£o com tÃ­tulo em `text-2xl` + `font-semibold` + `text-primary`
* descriÃ§Ã£o opcional em `text-sm` + `text-secondary`
* filtros acima da tabela com `Chip / Filter`, `Select / Default` ou `Input / Search`
* paginaÃ§Ã£o, carregar mais ou aÃ§Ãµes em Button / Secondary
* no mobile, usar rolagem horizontal e preservar cabeÃ§alho visÃ­vel sempre que possÃ­vel

---

## 9) Exemplos de uso

## 9.1 Exemplo de tokens em CSS variables

```css
:root {
  --text-primary: #111827;
  --text-secondary: #4B5563;
  --text-muted: #9CA3AF;
  --text-on-dark: #F9FAFB;
  --text-on-brand: #FFFFFF;

  --surface-page: #F8FAFC;
  --surface-section: #F1F5F9;
  --surface-card: #FFFFFF;
  --surface-subtle: #EEF2F7;
  --surface-elevated: #FFFFFF;

  --action-primary: #2563EB;
  --action-primary-hover: #1D4ED8;
  --action-primary-active: #1E40AF;
  --action-secondary: #E5E7EB;
  --action-strong: #0F172A;
  --action-strong-hover: #020617;

  --border-default: #D1D5DB;
  --border-subtle: #E5E7EB;
  --border-focus: #93C5FD;

  --status-success: #16A34A;
  --status-warning: #D97706;
  --status-error: #DC2626;
}
```

## 9.2 Exemplo de botÃ£o primÃ¡rio

```css
.btn-primary {
  background: var(--action-primary);
  color: var(--text-on-brand);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-button-primary);
  padding: var(--space-4);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.btn-primary:hover {
  background: var(--action-primary-hover);
}

.btn-primary:active {
  background: var(--action-primary-active);
}

.btn-primary:focus-visible {
  outline-color: var(--border-focus);
}

.btn-primary:disabled {
  background: var(--surface-subtle);
  color: var(--text-muted);
}
```

## 9.3 Exemplo de card

```css
.card {
  background: var(--surface-card);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-card);
  padding: var(--space-6);
}

.card:hover {
  box-shadow: var(--shadow-card-hover);
}
```

## 9.4 Exemplo de input

```css
.input {
  background: var(--surface-card);
  color: var(--text-primary);
  border-color: var(--border-default);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
  padding: var(--space-4);
  font-size: var(--text-base);
}

.input::placeholder {
  color: var(--text-muted);
}

.input:focus-visible {
  border-color: var(--border-focus);
  outline-color: var(--border-focus);
}

.input:disabled {
  background: var(--surface-subtle);
  color: var(--text-muted);
  border-color: var(--border-subtle);
}
```

## 9.5 Exemplo de tabela

```css
.table-wrapper {
  background: var(--surface-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-card);
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  min-width: 640px;
}

.table thead {
  background: var(--surface-section);
}

.table th {
  color: var(--text-primary);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  padding: var(--space-4);
  text-align: left;
  border-bottom: 1px solid var(--border-subtle);
}

.table td {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  padding: var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}

.table tbody tr:nth-child(odd) {
  background: var(--surface-card);
}

.table tbody tr:nth-child(even) {
  background: var(--surface-subtle);
}

.table tbody tr:hover {
  background: var(--surface-section);
}
```

---

## 10) Estrutura recomendada para white-label

### Camada 1 â€” Base do produto

Manter fixos:

* `surface-page`
* `surface-section`
* `surface-card`
* `surface-subtle`
* `surface-elevated`
* `text-primary`
* `text-secondary`
* `text-muted`
* `border-default`
* `border-subtle`
* `status-success`
* `status-warning`
* `status-error`

### Camada 2 â€” Identidade da marca

Customizar por cliente:

* `action-primary`
* `action-primary-hover`
* `action-primary-active`
* `action-strong`
* `action-strong-hover`
* `text-on-brand`
* `border-focus`

### Camada 3 â€” AplicaÃ§Ã£o em componentes

Nunca customizar componente por componente.
A troca deve acontecer no token, nÃ£o no componente.

---

## 11) Resumo prÃ¡tico

Este template resolve um app white-label com:

* base neutra
* aÃ§Ãµes configurÃ¡veis por marca
* componentes consistentes
* estados completos
* estrutura mobile-first
* documentaÃ§Ã£o pronta para implementaÃ§Ã£o

Se quiser evoluir este material, o prÃ³ximo passo ideal Ã© gerar:

* versÃ£o para **React Native**
* versÃ£o para **Flutter**
* versÃ£o em **Tailwind/CSS variables**
* biblioteca de componentes com nomenclatura tÃ©cnica
# 12) Componentes operacionais de farm

## Character Picker / Operational Selector

**Uso**: definir o personagem ativo da operacao de farm, exibindo contexto imediato de nome, nivel e classe.

**Tokens**

* container: `surface-card`
* fundo auxiliar: `surface-section`
* titulo: `text-2xl` + `font-semibold` + `text-primary`
* texto de apoio: `text-sm` + `text-secondary`
* destaque do personagem ativo: `surface-section`
* radius externo: `radius-xl`
* radius interno: `radius-lg`
* borda: `border-subtle`
* sombra: `shadow-card`
* espacamento interno: `space-6`

**Estrutura**

* incluir seletor principal no topo do modulo operacional
* empilhar `Selecionar personagem` e `Filtro instÃ¢ncia` em uma coluna central fixa, nessa ordem, inclusive no desktop
* mostrar resumo do personagem ativo com nome, nivel e classe
* a classe do personagem ativo deve combinar nome textual e icone visual
* quando nao houver personagem selecionado, usar empty state curto e orientado a acao
* quando nao houver personagens cadastrados, apontar para `/admin/characters`

**Estados**

* Default: personagem selecionado e destacado
* Focus: seletor com ring usando `border-focus`
* Empty: sem personagem ativo, com orientacao textual
* Disabled: usar `surface-subtle` e `text-muted` se a operacao estiver indisponivel
* Fallback visual: se a imagem da classe falhar, manter o nome da classe visivel sem imagem quebrada

## Farm Filter Panel

**Uso**: filtrar a lista operacional de instancias e expor estados rapidos da operacao.

**Tokens**

* container: `surface-card`
* campo de busca: `Input / Search`
* chips de apoio: `Chip / Filter`
* borda: `border-subtle`
* radius: `radius-xl`
* sombra: `shadow-card`

**Estrutura**

* conter ao menos um campo de busca por nome da instancia
* ficar abaixo do `Character Picker / Operational Selector`, sem voltar ao layout lado a lado
* pode exibir chips ou legendas curtas para status como disponivel, nivel e cooldown
* deve funcionar junto ao `Character Picker / Operational Selector`

**Estados**

* Default: campo ativo para o personagem selecionado
* Disabled: busca desabilitada enquanto nao houver personagem ativo
* Focus: campo com ring usando `border-focus`

## Farm Instance Card

**Uso**: representar uma instancia operacional com elegibilidade, itens farmaveis e acao de registro de execucao.

**Tokens**

* base: `surface-card`
* borda padrao: `border-subtle`
* titulo: `text-xl` + `font-semibold` + `text-primary`
* texto de apoio: `text-sm` + `text-secondary`
* badge de status: usar tokens de status compativeis com o contexto
* radius: `radius-xl`
* sombra: `shadow-card`
* padding: `space-6`

**Estrutura**

* cabecalho com nome da instancia, nivel minimo e badge de status
* mensagem operacional de disponibilidade ou bloqueio
* corpo operacional em duas areas no desktop: grade de itens a esquerda e resumo compacto a direita
* altura fixa recomendada do corpo operacional no desktop: `560px`
* a altura fixa vale apenas abaixo do cabecalho; o topo do card continua com altura natural
* em mobile, a coluna de resumo empilha abaixo da grade de itens e o card volta a altura natural
* a rolagem vertical deve ficar restrita a area da grade de itens
* bloco de resumo com CTA para registrar 1 execucao, sem rolar junto com os itens
* itens sem `divinePrideId` devem usar fallback visual seguro

**Estados**

* `card disponivel`: fundo `surface-card`, destaque leve de acao e CTA ativo
* `card bloqueado por nivel`: fundo com variacao quente suave, badge de aviso e controles desabilitados
* `card em cooldown`: fundo com variacao fria suave, data de liberacao visivel e controles desabilitados
* Hover: reforco sutil de sombra sem competir com o status
* Focus: ring com `border-focus` em gatilhos internos

## Farm Item Grid

**Uso**: organizar os itens da instancia em uma grade mais densa para reduzir altura total do card operacional sem perder leitura.

**Tokens**

* grid container: `surface-card`
* item card: `surface-card`
* borda do item: `border-subtle`
* nome do item: `text-sm` + `font-semibold` + `text-primary`
* metadado: `text-xs` + `text-secondary`
* radius do item: `radius-lg`
* gap da grade: `space-3`

**Estrutura**

* distribuicao recomendada: `4` colunas no desktop grande, `3` no desktop medio, `2` no tablet e `1` no mobile
* a grade deve preencher a altura disponivel do corpo do card
* quando houver mais itens do que o espaco comporta, aplicar rolagem vertical apenas na grade
* cada item deve exibir icone, nome completo, referencia Divine Pride ou fallback e stepper
* o nome do item nao usa truncamento de uma linha
* o nome deve quebrar naturalmente em multiplas linhas, priorizando leitura completa sem ellipsis artificial
* se um nome ultrapassar o espaco usual de duas linhas, o card do item pode crescer verticalmente dentro da propria celula do grid
* o stepper deve ficar em regiao estavel do card, preferencialmente no rodape

## Counter / Stepper

**Uso**: registrar quantidades de drop por item dentro do card operacional.

**Tokens**

* container: `surface-section`
* botao default: `surface-card` + `border-default`
* botao hover: `surface-subtle`
* valor atual: `surface-card`
* texto: `text-primary`
* valor desabilitado: `text-muted`
* radius: `radius-full` no grupo e `radius-md` ou `radius-lg` nos elementos

**Estrutura**

* seguir o padrao `- quantidade +`
* manter leitura centralizada da quantidade atual
* evitar inputs minusculos; priorizar toque confortavel

**Estados**

* `stepper ativo`: botoes clicaveis e valor com contraste claro
* `stepper desabilitado`: fundo `surface-subtle`, botoes sem destaque e texto `text-muted`
* Focus: ring com `border-focus` nos botoes

## History List / Operational

**Uso**: mostrar execucoes recentes do personagem ativo de forma compacta e escaneavel.

**Tokens**

* container: `surface-card`
* divisores: `border-subtle`
* titulo do registro: `text-sm` ou `text-base` + `font-semibold` + `text-primary`
* metadados: `text-xs` + `text-secondary`
* resumo de drops: `text-sm` + `text-secondary`
* radius: `radius-xl`
* sombra: `shadow-card`

**Estrutura**

* cada linha deve mostrar instancia, data/hora de execucao e resumo dos drops
* a lista deve ordenar do mais recente para o mais antigo
* quando nao houver registros, usar empty state compacto
* pode exibir pequenos icones de itens para reforcar leitura
* a partir da v1 com pagina de relatorios, este componente nao deve mais ocupar espaco na pagina `/farm`
* o historico operacional passa a ficar concentrado em contextos dedicados de consulta, como `/reports`

**Estados**

* Default: lista rolavel e legivel
* Loading: skeletons compactos
* Empty: mensagem curta orientando o primeiro registro

# 13) NavegaÃ§Ã£o global com sidebar

## App Shell / With Sidebar

**Uso**: estruturar toda a aplicaÃ§Ã£o com navegaÃ§Ã£o persistente Ã  esquerda e conteÃºdo principal Ã  direita.

**Tokens**

* shell: `surface-page`
* sidebar: superfÃ­cie escura prÃ³pria da aplicaÃ§Ã£o
* conteÃºdo principal: `surface-page`
* borda de separaÃ§Ã£o: `border-subtle`
* sombra lateral: `shadow-lg`

**Estrutura**

* o shell deve envolver todas as pÃ¡ginas canÃ´nicas da aplicaÃ§Ã£o
* no desktop, o sidebar fica fixo Ã  esquerda
* no mobile, a navegaÃ§Ã£o vira drawer recolhido
* a Ã¡rea principal deve continuar responsÃ¡vel apenas pelo conteÃºdo de cada pÃ¡gina

## Sidebar / Primary Navigation

**Uso**: navegaÃ§Ã£o principal persistente entre mÃ³dulos administrativos e operacionais.

**Tokens**

* fundo base: superfÃ­cie escura de alta contraste
* texto padrÃ£o: `text-on-dark`
* texto secundÃ¡rio: tom dessaturado de apoio
* item ativo: destaque com cor de marca
* borda interna: contraste suave sobre fundo escuro
* radius dos itens: `radius-xl`

**Estrutura**

* topo com branding do app
* grupo Ãºnico de rotas principais
* entradas canÃ´nicas:
  * `InÃ­cio`
  * `Farm`
  * `Itens`
  * `InstÃ¢ncias`
  * `Personagens`
* nÃ£o mostrar aliases que apenas redirecionam

**Estados**

* Default: item legÃ­vel com Ã­cone e descriÃ§Ã£o curta
* Hover: reforÃ§o de contraste e superfÃ­cie
* Active: destaque forte de fundo, borda e Ã­cone
* Focus: ring visÃ­vel com `border-focus`
* Disabled: nÃ£o aplicÃ¡vel na v1

## Nav Item / RPG

**Uso**: representar cada rota com Ã­cone temÃ¡tico de RPG sem perder clareza administrativa.

**DireÃ§Ã£o visual**

* `InÃ­cio`: castelo, fortaleza, mapa-base ou hall principal
* `Farm`: espada, arma cruzada ou sÃ­mbolo de loot
* `Itens`: poÃ§Ã£o, gema, saco de tesouro ou consumÃ­vel
* `InstÃ¢ncias`: portal, dungeon gate, runa ou obelisco
* `Personagens`: elmo, busto de aventureiro ou emblema de guilda

**Regras**

* usar SVG prÃ³prio da aplicaÃ§Ã£o
* manter leitura simples em tamanhos pequenos
* o Ã­cone deve herdar cor por estado do item de navegaÃ§Ã£o
* evitar excesso de detalhe decorativo

## Mobile Drawer / Navigation

**Uso**: expor a navegaÃ§Ã£o principal em telas menores sem manter sidebar aberto o tempo todo.

**Tokens**

* overlay: camada escura translÃºcida
* painel: mesma base visual do sidebar desktop
* botÃ£o de abertura: `Button / Secondary` adaptado ao contexto
* botÃ£o de fechar: controle visual claro no topo do painel

**Estrutura**

* menu fechado por padrÃ£o
* abrir por botÃ£o global no topo mobile
* fechar ao clicar fora, ao navegar ou ao pressionar `Escape`
* manter a mesma lista de rotas canÃ´nicas do sidebar desktop

**Estados**

* Closed: oculto, sem interferir no conteÃºdo
* Open: painel visÃ­vel com overlay
* Focus: gatilhos e links com foco visÃ­vel

## Checklist Filter / Multi-select

**Uso**: selecionar múltiplas entidades em filtros operacionais ou relatórios, com ênfase em listas administrativas como personagens e instâncias.

**Tokens**

* container: `surface-card`
* item: `surface-section`
* borda: `border-subtle`
* checkbox: seguir `Checkbox / Default`
* ações auxiliares: botões secundários compactos
* altura máxima recomendada da lista: entre `240px` e `320px`, com rolagem interna

**Estrutura**

* cabeçalho com título do grupo e resumo da quantidade selecionada
* ações `Selecionar todos` e `Limpar` no topo do conteúdo
* lista de opções com label principal e metadado secundário
* usar painel expansível quando o bloco fizer parte de uma área de filtros maior

**Estados**

* Default: lista visível e utilizável
* Hover: item com reforço suave de superfície
* Focus: checkbox e gatilhos com ring usando `border-focus`
* Empty: orientação curta apontando para o módulo de cadastro relacionado
* Disabled: ações e opções com `text-muted` e menor contraste

## Report Filter Panel

**Uso**: concentrar os filtros principais da tela de relatórios de farm.

**Tokens**

* container: `surface-card`
* blocos internos: `surface-section` e `surface-card`
* chips de resumo: `Chip / Filter`
* borda: `border-subtle`
* radius: `radius-xl`
* sombra: `shadow-card`

**Estrutura**

* cabeçalho com título e texto de apoio
* ações principais à direita ou abaixo: `Gerar relatório` e `Restaurar padrão`
* bloco de data com alternância entre `Diário` e `Período`
* dois grupos multi-seleção para `Personagens` e `Instâncias`
* chips finais resumindo o recorte ativo

**Estados**

* Default: filtros preenchidos com os defaults do relatório
* Loading: ação principal em estado ocupado e conteúdo preservado
* Empty: ausência de personagens ou instâncias com orientação para o admin correspondente
* Error: feedback visível sem desalojar o painel

## Nav Item / Reports

**Uso**: representar o módulo `Relatórios` na navegação global com leitura temática de ledger ou pergaminho.

**Direção visual**

* usar ícone próprio em SVG inline
* priorizar silhueta simples de livro-caixa, registro ou pergaminho
* o ícone deve herdar cor por estado do item de navegação, sem efeitos independentes

## Item Price History / Modal

**Uso**: exibir auditoria compacta de alterações reais de preço dentro do modal administrativo de edição de item.

**Tokens**

* container: `surface-subtle` ou `surface-card`
* item de histórico: `surface-card`
* borda: `border-subtle`
* título do bloco: `text-sm` + `font-semibold` + `text-secondary`
* valor principal: `text-sm` + `font-semibold` + `text-primary`
* metadado de data: `text-xs` + `text-secondary`
* radius: `radius-xl` no bloco e `radius-lg` nas linhas internas

**Estrutura**

* aparecer somente em modo de edição do item
* posicionar abaixo da checkbox `Venda para NPC` e acima das ações finais do modal
* cada linha deve mostrar `preço antigo -> preço novo`
* cada linha deve exibir data e hora em `pt-BR`
* a lista deve vir da alteração mais recente para a mais antiga
* quando o histórico crescer, aplicar altura máxima com rolagem interna
* quando não houver registros, usar empty state curto dentro do próprio bloco

**Estados**

* Default: lista compacta e legível
* Loading: skeletons curtos preservando a área do bloco
* Empty: mensagem `Nenhuma alteração de preço registrada.`
## Item Price History / Modal / Two Columns

**Uso**: ajustar o modal administrativo de edição de item para que o histórico de preço funcione como coluna lateral de apoio no desktop.

**Estrutura**

* manter o formulário na coluna principal à esquerda
* renderizar o histórico de preço em uma coluna secundária à direita
* no mobile, permitir que o histórico volte a empilhar abaixo do formulário
* preservar a rolagem interna do histórico sem expandir excessivamente a altura do modal
* manter as ações `Cancelar` e `Salvar alterações` associadas visualmente ao formulário principal
