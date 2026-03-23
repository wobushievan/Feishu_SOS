const { Client, AppType, Domain } = require('@larksuiteoapi/node-sdk');

const ACTION_NAME = 'send_feishu_message';

function getRequiredEnv(name) {
  const value = process.env[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function createClient() {
  return new Client({
    appId: getRequiredEnv('FEISHU_APP_ID'),
    appSecret: getRequiredEnv('FEISHU_APP_SECRET'),
    appType: AppType.SelfBuild,
    domain: Domain.Feishu,
  });
}

function normalizeReceiverUserList(input) {
  if (Array.isArray(input?.receiverUserList)) {
    return input.receiverUserList.filter(item => typeof item === 'string' && item.trim() !== '');
  }

  if (typeof input?.receiverUserList === 'string' && input.receiverUserList.trim() !== '') {
    return [input.receiverUserList.trim()];
  }

  return [];
}

function normalizeTitle(titleConfig) {
  if (typeof titleConfig === 'string' && titleConfig.trim() !== '') {
    return {
      content: titleConfig.trim(),
      color: 'blue',
    };
  }

  return {
    content: titleConfig?.title ? String(titleConfig.title) : '飞书通知',
    color: titleConfig?.titleColor ? String(titleConfig.titleColor) : 'blue',
  };
}

function normalizeButtons(buttons) {
  if (!Array.isArray(buttons)) {
    return [];
  }

  return buttons
    .filter(button => button && typeof button.url === 'string' && button.url.trim() !== '')
    .map(button => ({
      text: button.text ? String(button.text) : '查看详情',
      style: button.style ? String(button.style) : 'default',
      url: button.url.trim(),
    }));
}

function mapButtonStyle(style) {
  if (style === 'primary' || style === 'danger') {
    return style;
  }
  return 'default';
}

function buildCardContent(input) {
  const title = normalizeTitle(input?.title);
  const buttons = normalizeButtons(input?.buttons);
  const content = typeof input?.content === 'string' ? input.content : '';

  const elements = [
    {
      tag: 'markdown',
      content,
      text_size: 'normal',
      margin: '0px 0px 8px 0px',
    },
  ];

  if (buttons.length > 0) {
    elements.push({
      tag: 'column_set',
      flex_mode: 'stretch',
      horizontal_spacing: '8px',
      columns: buttons.map(button => ({
        tag: 'column',
        width: 'auto',
        elements: [
          {
            tag: 'button',
            text: {
              tag: 'plain_text',
              content: button.text,
            },
            type: mapButtonStyle(button.style),
            width: 'default',
            size: 'medium',
            behaviors: [
              {
                type: 'open_url',
                default_url: button.url,
              },
            ],
            margin: '4px 0px 4px 0px',
          },
        ],
        vertical_spacing: '8px',
      })),
      margin: '0px 0px 0px 0px',
    });
  }

  return {
    schema: '2.0',
    config: {
      update_multi: true,
    },
    header: {
      template: title.color,
      title: {
        tag: 'plain_text',
        content: title.content,
      },
    },
    body: {
      direction: 'vertical',
      padding: '12px 12px 12px 12px',
      elements,
    },
  };
}

async function sendInteractiveMessage(client, receiveId, receiveIdType, cardContent) {
  let response;
  try {
    response = await client.im.message.create({
      params: { receive_id_type: receiveIdType },
      data: {
        receive_id: receiveId,
        msg_type: 'interactive',
        content: JSON.stringify(cardContent),
      },
    });
  } catch (error) {
    const responseBody = error && typeof error === 'object' && error.response ? error.response.data || error.response : null;
    const responseText = responseBody ? JSON.stringify(responseBody) : (error instanceof Error ? error.message : String(error));
    throw new Error(`[${receiveIdType}] transport_error: ${responseText}`);
  }

  if (response.code !== 0) {
    throw new Error(`[${receiveIdType}] api_error ${response.code}: ${response.msg}`);
  }

  return response.data?.message_id || '';
}

async function sendWithCompatibleIdTypes(client, receiveId, cardContent, logger) {
  const candidateIdTypes = ['user_id', 'open_id'];
  const failures = [];

  for (const receiveIdType of candidateIdTypes) {
    try {
      logger?.log?.(`[send-feishu-message-shim] trying receive_id_type=${receiveIdType} for receiver=${receiveId}`);
      const messageId = await sendInteractiveMessage(client, receiveId, receiveIdType, cardContent);
      logger?.log?.(`[send-feishu-message-shim] sent receiver=${receiveId} via ${receiveIdType}, messageId=${messageId}`);
      return {
        messageId,
        receiveIdType,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${receiveIdType}: ${message}`);
      logger?.warn?.(`[send-feishu-message-shim] failed receiver=${receiveId} via ${receiveIdType}: ${message}`);
    }
  }

  throw new Error(`All receive_id_type attempts failed for ${receiveId}: ${failures.join(' | ')}`);
}

function create() {
  const client = createClient();

  return {
    hasAction(actionName) {
      return actionName === ACTION_NAME;
    },
    listActions() {
      return [ACTION_NAME];
    },
    getActionSchema() {
      return null;
    },
    getInputSchema() {
      return undefined;
    },
    getOutputSchema() {
      return undefined;
    },
    async run(actionName, context, input) {
      if (actionName !== ACTION_NAME) {
        const error = new Error(`Unsupported action: ${actionName}`);
        error.code = 'ACTION_NOT_FOUND';
        throw error;
      }

      const receiverUserList = normalizeReceiverUserList(input);
      if (receiverUserList.length === 0) {
        const error = new Error('receiverUserList is required');
        error.code = 'INVALID_INPUT';
        throw error;
      }

      const cardContent = buildCardContent(input);
      const logger = context?.logger;
      const results = [];

      for (const receiverId of receiverUserList) {
        const result = await sendWithCompatibleIdTypes(client, receiverId, cardContent, logger);
        results.push({
          receiverId,
          receiveIdType: result.receiveIdType,
          messageId: result.messageId,
        });
      }

      return {
        success: true,
        sentCount: results.length,
        messageIds: results.map(item => item.messageId),
        results,
      };
    },
  };
}

module.exports = {
  create,
};
