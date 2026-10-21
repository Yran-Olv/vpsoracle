# Walkthrough — VPS Multivus Monitoring System

O sistema **VPS Multivus** foi desenvolvido, testado e implantado com sucesso em produção para monitoramento completo em tempo real da VPS Oracle Cloud Always Free ([https://vps.multivus.com.br](https://vps.multivus.com.br)).

---

## 🚀 Metadados Reais da Instância Oracle Cloud (IMDS v2)

O painel integra diretamente com o **Oracle Instance Metadata Service (IMDS v2)** em `http://169.254.169.254/opc/v2/instance/` e `http://169.254.169.254/opc/v2/vnics/`, identificando com precisão a alocação da máquina e comparando-a com a cota total da Tenancy Always Free:

| Propriedade OCI | Valor Real Detectado na VPS | Cota Tenancy Always Free | Status |
| :--- | :--- | :--- | :--- |
| **Nome da Instância** | `multivusvps` | - | 🟢 `RUNNING` |
| **Shape** | `VM.Standard.A1.Flex` (Ampere A1 ARM) | `VM.Standard.A1.Flex` | 🟢 Suportado |
| **OCPUs Alocadas** | **2 OCPUs** | **4 OCPUs** (3.000 OCPU-horas/mês) | 🟢 50% alocado (**2 OCPUs livres**) |
| **Memória RAM** | **12 GB RAM** | **24 GB RAM** (18.000 GB-horas/mês) | 🟢 50% alocado (**12 GB livres**) |
| **IP Público / Privado** | `147.15.19.44` / `10.0.0.34` | 2 IPs Públicos Always Free | 🟢 1 de 2 em uso (**1 livre**) |
| **Armazenamento Boot** | `46.6 GB` partição raiz | 200 GB Total (Boot + Block) | 🟢 23.3% (**153.4 GB livres**) |
| **Disponibilidade / Falha** | `AD-1 (sa-saopaulo-1-ad-1)` / `FAULT-DOMAIN-3` | Região `sa-saopaulo-1 (GRU)` | 🟢 Operacional |
| **OCID** | `ocid1.instance.oc1.sa-saopaulo-1.antxeljrtu5uzvycixdeslguvkhgz7tradcgwxyregxaa4eyy4tghaxrcgeq` | - | 🟢 Verificado |
| **Lançamento** | `09/09/2026, 11:21:43 UTC` (`1788952903101`) | - | 🟢 Ativo |

---

## 📸 Capturas de Tela do Painel com Dados Reais

Abaixo estão as capturas em tempo real obtidas na VPS em produção (`https://vps.multivus.com.br`):

````carousel
![Dashboard com Card Real da Instância OCI multivusvps e Oracle Free Guard](/home/yran/.gemini/antigravity-ide/brain/bf15d017-01bc-4dea-942f-e52cf259ab57/dashboard_page_1788963454664.png)
<!-- slide -->
![Oracle Cloud Always Free Hub com Balanço de Cotas e Limites Oficiais](/home/yran/.gemini/antigravity-ide/brain/bf15d017-01bc-4dea-942f-e52cf259ab57/oracle_page_1788963495257.png)
<!-- slide -->
![Modal de Checkup Automático de Segurança (18 Testes em Tempo Real)](/home/yran/.gemini/antigravity-ide/brain/bf15d017-01bc-4dea-942f-e52cf259ab57/checkup_modal_1788962872424.png)
````

---

## 🎯 Módulos em Operação

1. **Card de Telemetria da Instância OCI**: Exibe Nome (`multivusvps`), OCID com botão de cópia em 1 clique, link direto para a console Oracle Cloud, Shape (`VM.Standard.A1.Flex`), 2 OCPUs, 12 GB RAM, IPs, AD-1 e Fault Domain 3.
2. **Balanço da Cota Tenancy (Ampere A1)**: Barras dinâmicas indicando o uso desta VM (50% CPU / 50% RAM) e a margem restante para criar novas instâncias Always Free na tenancy sem custo.
3. **Oracle Free Guard**: Acompanhamento rigoroso de CPU, RAM, Storage (200 GB), Transferência de Saída (10 TB) e Política de Reclamação por Ociosidade (*Idle Policy*).
4. **Billing Protection**: Monitoramento de budget (US$ 1,00) com aviso de que o budget é mecanismo de alerta.
5. **Telemetria do Servidor VPS**: CPU, memória, swap, IOPS de disco, taxas de leitura/escrita e interfaces de rede.
6. **Docker Engine**: Gerenciamento de containers via `/var/run/docker.sock`, status healthcheck e visualizador de logs.
7. **Serviços Linux & Domínios**: Nginx, Docker, SSH, UFW, DNS e monitoramento com contagem regressiva de expiração SSL.
8. **Oracle & Reddit News**: Agregador diário de tópicos comunitários (`r/oraclecloud`, `r/selfhosted`) com aviso explícito de não confirmação oficial para fontes do Reddit.
9. **Checkup de 1 Clique**: Diagnóstico completo em 18 etapas com exportação de relatório em Markdown.

---

## 🔑 Acesso de Produção

- **URL:** [https://vps.multivus.com.br](https://vps.multivus.com.br)
- **Usuário:** `admin`
- **Senha:** `Systemzap@2025`
