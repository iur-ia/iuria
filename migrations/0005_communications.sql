-- Communication Templates table
CREATE TABLE IF NOT EXISTS "communication_templates" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "nome" text NOT NULL,
  "categoria" text NOT NULL,
  "descricao" text,
  "corpo" text NOT NULL,
  "campos_obrigatorios" text,
  "ativo" boolean NOT NULL DEFAULT true,
  "pre_configurada" boolean NOT NULL DEFAULT false,
  "usos" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint

-- Communications (generated documents) table
CREATE TABLE IF NOT EXISTS "communications" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "template_id" varchar REFERENCES "communication_templates"("id"),
  "acervo_id" varchar REFERENCES "acervo_processos"("id") ON DELETE SET NULL,
  "acervo_numero" text,
  "destinatario" text NOT NULL,
  "assunto" text,
  "dados_preenchidos" text,
  "html_gerado" text,
  "status" text NOT NULL DEFAULT 'gerada',
  "protocolo" text,
  "responsavel_id" varchar REFERENCES "equipe"("id"),
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint

-- Escritorio Config (single-row settings table)
CREATE TABLE IF NOT EXISTS "escritorio_config" (
  "id" integer PRIMARY KEY DEFAULT 1,
  "nome" text,
  "oab" text,
  "cnpj" text,
  "endereco" text,
  "complemento" text,
  "cidade" text,
  "estado" text,
  "cep" text,
  "telefone" text,
  "email" text,
  "website" text,
  "logo_url" text,
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint

-- Seed 5 pre-configured communication templates
INSERT INTO "communication_templates" ("nome", "categoria", "descricao", "corpo", "campos_obrigatorios", "ativo", "pre_configurada", "usos") VALUES
(
  'Ofício Genérico ao Juízo',
  'oficio',
  'Ofício padrão dirigido ao juízo da vara competente',
  '<div style="font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.8; max-width: 800px; margin: auto; padding: 40px;">
  <div style="text-align: center; margin-bottom: 32px; border-bottom: 2px solid #333; padding-bottom: 16px;">
    <h2 style="margin: 0; font-size: 14pt;">{{escritorio.nome}}</h2>
    <p style="margin: 4px 0; font-size: 10pt; color: #555;">OAB: {{escritorio.oab}} | {{escritorio.endereco}}</p>
    <p style="margin: 4px 0; font-size: 10pt; color: #555;">Tel: {{escritorio.telefone}} | {{escritorio.email}}</p>
  </div>
  <p style="text-align: right;">{{cidade_escritorio}}, {{data_atual}}</p>
  <p><strong>Processo nº:</strong> {{processo.numero}}</p>
  <p>Ao Meritíssimo Juiz(a) da<br><strong>{{vara}}</strong></p>
  <p>{{destinatario}}</p>
  <p style="text-indent: 40px;">{{escritorio.nome}}, por seus advogados abaixo subscritos, vem respeitosamente à presença de Vossa Excelência, nos autos do processo em epígrafe, requerer o que se segue:</p>
  <p style="text-indent: 40px;">{{corpo_oficio}}</p>
  <p style="text-indent: 40px;">Termos em que,<br>Pede deferimento.</p>
  <p>{{cidade_escritorio}}, {{data_atual}}.</p>
  <div style="margin-top: 48px; text-align: center;">
    <p style="border-top: 1px solid #333; display: inline-block; padding-top: 4px; min-width: 300px;">{{advogado.nome}}<br><small>OAB/{{advogado.oab}}</small></p>
  </div>
</div>',
  '["vara","cidade_escritorio","corpo_oficio"]',
  true, true, 0
),
(
  'Notificação Extrajudicial',
  'notificacao',
  'Notificação extrajudicial para constituição em mora ou comunicação formal',
  '<div style="font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.8; max-width: 800px; margin: auto; padding: 40px;">
  <div style="text-align: center; margin-bottom: 32px; border-bottom: 2px solid #333; padding-bottom: 16px;">
    <h2 style="margin: 0; font-size: 14pt;">{{escritorio.nome}}</h2>
    <p style="margin: 4px 0; font-size: 10pt; color: #555;">OAB: {{escritorio.oab}} | {{escritorio.endereco}}</p>
  </div>
  <h2 style="text-align: center; letter-spacing: 2px; margin-bottom: 24px;">NOTIFICAÇÃO EXTRAJUDICIAL</h2>
  <p><strong>NOTIFICANTE:</strong> {{cliente.nome}}, representado por {{escritorio.nome}}, OAB {{escritorio.oab}}.</p>
  <p><strong>NOTIFICADO(A):</strong> {{destinatario}}</p>
  <p style="text-indent: 40px;">Vimos, por meio desta, NOTIFICAR Vossa Senhoria, na qualidade de {{qualificacao_notificado}}, que:</p>
  <p style="text-indent: 40px;">{{corpo_notificacao}}</p>
  <p style="text-indent: 40px;">Caso não haja manifestação no prazo de <strong>{{prazo_dias}} dias</strong> contados do recebimento desta, tomaremos as medidas judiciais cabíveis, incluindo a propositura de ação judicial competente, com todos os ônus decorrentes.</p>
  <p>{{cidade_escritorio}}, {{data_atual}}.</p>
  <div style="margin-top: 48px; text-align: center;">
    <p style="border-top: 1px solid #333; display: inline-block; padding-top: 4px; min-width: 300px;">{{advogado.nome}}<br><small>OAB/{{advogado.oab}}</small></p>
  </div>
  <div style="margin-top: 32px; border: 1px solid #ccc; padding: 16px; font-size: 10pt;">
    <strong>AVISO DE RECEBIMENTO</strong><br>
    Recebi a presente notificação em ___/___/______.<br>
    Assinatura: ___________________________
  </div>
</div>',
  '["qualificacao_notificado","corpo_notificacao","prazo_dias","cidade_escritorio"]',
  true, true, 0
),
(
  'Carta de Apresentação do Advogado',
  'carta',
  'Carta formal apresentando o advogado como representante do cliente em negociações',
  '<div style="font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.8; max-width: 800px; margin: auto; padding: 40px;">
  <div style="text-align: center; margin-bottom: 32px; border-bottom: 2px solid #333; padding-bottom: 16px;">
    <h2 style="margin: 0; font-size: 14pt;">{{escritorio.nome}}</h2>
    <p style="margin: 4px 0; font-size: 10pt; color: #555;">{{escritorio.endereco}} | Tel: {{escritorio.telefone}}</p>
    <p style="margin: 4px 0; font-size: 10pt; color: #555;">{{escritorio.email}}{{#if escritorio.website}} | {{escritorio.website}}{{/if}}</p>
  </div>
  <p style="text-align: right;">{{cidade_escritorio}}, {{data_atual}}</p>
  <p>À<br><strong>{{destinatario}}</strong></p>
  <p>Ref.: Apresentação de Advogado — {{cliente.nome}}</p>
  <p>Prezados Senhores,</p>
  <p style="text-indent: 40px;">Vimos, por meio desta, apresentar o Dr./Dra. <strong>{{advogado.nome}}</strong>, inscrito(a) na OAB sob o nº <strong>{{advogado.oab}}</strong>, como advogado(a) regularmente constituído(a) para representar os interesses de <strong>{{cliente.nome}}</strong>, {{qualificacao_cliente}}, nos assuntos referentes a {{assunto_representacao}}.</p>
  <p style="text-indent: 40px;">Quaisquer comunicações, propostas ou documentos deverão ser encaminhados diretamente ao escritório, nos contatos acima indicados.</p>
  <p style="text-indent: 40px;">Permanecemos à disposição para quaisquer esclarecimentos.</p>
  <p>Atenciosamente,</p>
  <div style="margin-top: 48px; text-align: center;">
    <p style="border-top: 1px solid #333; display: inline-block; padding-top: 4px; min-width: 300px;">{{advogado.nome}}<br><small>OAB/{{advogado.oab}}</small></p>
  </div>
</div>',
  '["qualificacao_cliente","assunto_representacao","cidade_escritorio"]',
  true, true, 0
),
(
  'Ofício a Cartório de Registro de Imóveis',
  'oficio',
  'Ofício solicitando certidão, registro ou averbação junto ao Cartório de RI',
  '<div style="font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.8; max-width: 800px; margin: auto; padding: 40px;">
  <div style="text-align: center; margin-bottom: 32px; border-bottom: 2px solid #333; padding-bottom: 16px;">
    <h2 style="margin: 0; font-size: 14pt;">{{escritorio.nome}}</h2>
    <p style="margin: 4px 0; font-size: 10pt; color: #555;">OAB: {{escritorio.oab}} | {{escritorio.endereco}}</p>
  </div>
  <p style="text-align: right;">{{cidade_escritorio}}, {{data_atual}}</p>
  <p>Ao<br><strong>{{destinatario}}</strong><br>Cartório de Registro de Imóveis — {{comarca}}</p>
  <p><strong>Assunto:</strong> {{assunto}}</p>
  <p>Senhor(a) Oficial,</p>
  <p style="text-indent: 40px;">{{escritorio.nome}}, na qualidade de advogado(a) regularmente inscrito(a) na OAB {{escritorio.oab}}, representando {{cliente.nome}}, vem, respeitosamente, requerer a Vossa Senhoria:</p>
  <p style="text-indent: 40px;">{{pedido_cartorio}}</p>
  <p style="text-indent: 40px;">O imóvel objeto da presente solicitação está cadastrado sob matrícula nº <strong>{{matricula_imovel}}</strong>, localizado em {{endereco_imovel}}.</p>
  <p style="text-indent: 40px;">Desde já, agradecemos a atenção e nos colocamos à disposição para quaisquer esclarecimentos adicionais.</p>
  <p>Respeitosamente,</p>
  <div style="margin-top: 48px; text-align: center;">
    <p style="border-top: 1px solid #333; display: inline-block; padding-top: 4px; min-width: 300px;">{{advogado.nome}}<br><small>OAB/{{advogado.oab}}</small></p>
  </div>
</div>',
  '["comarca","pedido_cartorio","matricula_imovel","endereco_imovel","cidade_escritorio"]',
  true, true, 0
),
(
  'Comunicação de Encerramento de Mandato',
  'carta',
  'Carta formal comunicando o encerramento da representação advocatícia',
  '<div style="font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.8; max-width: 800px; margin: auto; padding: 40px;">
  <div style="text-align: center; margin-bottom: 32px; border-bottom: 2px solid #333; padding-bottom: 16px;">
    <h2 style="margin: 0; font-size: 14pt;">{{escritorio.nome}}</h2>
    <p style="margin: 4px 0; font-size: 10pt; color: #555;">OAB: {{escritorio.oab}} | {{escritorio.endereco}}</p>
  </div>
  <p style="text-align: right;">{{cidade_escritorio}}, {{data_atual}}</p>
  <p>À<br><strong>{{destinatario}}</strong></p>
  <p>Ref.: Encerramento de Mandato — Processo nº {{processo.numero}}</p>
  <p>Prezado(a) Senhor(a),</p>
  <p style="text-indent: 40px;">Por meio desta, comunicamos formalmente o encerramento da representação advocatícia exercida por <strong>{{escritorio.nome}}</strong>, OAB {{escritorio.oab}}, nos interesses de <strong>{{cliente.nome}}</strong>, nos autos do processo nº <strong>{{processo.numero}}</strong>, em tramitação perante {{processo.tribunal}}.</p>
  <p style="text-indent: 40px;">O encerramento do mandato se dá em razão de: <strong>{{motivo_encerramento}}</strong>.</p>
  <p style="text-indent: 40px;">Informamos que todos os documentos relativos ao processo estarão disponíveis para retirada em nossa sede, pelo prazo de 30 (trinta) dias a contar desta data.</p>
  <p style="text-indent: 40px;">Permanecemos à disposição para eventuais esclarecimentos.</p>
  <p>Atenciosamente,</p>
  <div style="margin-top: 48px; text-align: center;">
    <p style="border-top: 1px solid #333; display: inline-block; padding-top: 4px; min-width: 300px;">{{advogado.nome}}<br><small>OAB/{{advogado.oab}}</small></p>
  </div>
</div>',
  '["motivo_encerramento","cidade_escritorio"]',
  true, true, 0
);
