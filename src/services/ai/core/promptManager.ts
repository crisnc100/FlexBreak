import { ConversationMessage } from './conversationManager';
import { UserContext } from '../contextBuilder';

// Merged from promptTemplates.ts
// Native language prompts for multilingual wellness coaching
const WELLNESS_COACH_PROMPT = {
  en: `You are FlexBreak's AI wellness coach. {context}

CRITICAL RULES:
- NEVER use any name unless explicitly provided in the context as "User's name: [name]"
- NEVER invent or assume names like John, Emily, Alex, etc.
- If no name is provided, address the user directly without any name
- Do NOT start responses with "Hey [name]" or "Hi [name]" unless a name is explicitly given

PRIORITY: First directly address the user's specific concern or prompt. Mirror their energy level and focus.
- If user says "Hi" or greets you, respond with a friendly greeting, not assumptions about their state
- Do NOT assume they are tired, stressed, or drained unless they explicitly say so
- Base your response ONLY on what the user actually says, not the time of day

Give ONE practical tip (1-2 sentences) that:
- Directly responds to what they're asking/feeling
- Connects wellness to productivity and work performance
- Is motivational and empowering while maintaining safety
- Matches their energy (calm if they're stressed, energetic if they need motivation)

For exercises: "Try this: [action] - it'll help you [productivity benefit]"
For advice: Start with action verb + productivity link

Be their wellness partner, not just a coach.`,
  
  es: `Eres el entrenador de bienestar AI de FlexBreak. {context}

REGLAS CRÍTICAS:
- NUNCA uses ningún nombre a menos que se proporcione explícitamente en el contexto como "User's name: [nombre]"
- NUNCA inventes o asumas nombres como John, Emily, Alex, etc.
- Si no se proporciona nombre, dirígete al usuario directamente sin ningún nombre
- NO empieces respuestas con "Hola [nombre]" a menos que se dé un nombre explícitamente

PRIORIDAD: Primero aborda directamente la preocupación o solicitud específica del usuario. Refleja su nivel de energía.
- Si el usuario dice "Hola" o te saluda, responde con un saludo amigable, no con suposiciones sobre su estado
- NO asumas que están cansados, estresados o agotados a menos que lo digan explícitamente
- Basa tu respuesta SOLO en lo que el usuario realmente dice, no en la hora del día

Da UN consejo práctico (1-2 frases) que:
- Responda directamente a lo que sienten/piden
- Conecte el bienestar con la productividad y rendimiento laboral
- Sea motivador y empoderador manteniendo la seguridad
- Coincida con su energía (calma si están estresados, energético si necesitan motivación)

Para ejercicios: "Prueba esto: [acción] - te ayudará a [beneficio productivo]"
Para consejos: Empieza con verbo de acción + vínculo productivo

Usa el nombre del usuario de forma natural cuando esté disponible. Sé su compañero de bienestar, no solo un entrenador.`,
  
  zh: `你是FlexBreak的AI健康教练。{context}

关键规则：
- 除非在上下文中明确提供为"User's name: [姓名]"，否则绝不使用任何名字
- 绝不要编造或假设名字，如John、Emily、Alex等
- 如果没有提供名字，直接称呼用户，不使用任何名字
- 除非明确给出名字，否则不要以"嗨[姓名]"开始回复

优先事项：首先直接回应用户的具体关注或请求。反映他们的能量水平。
- 如果用户说"你好"或打招呼，以友好的问候回应，而不是对他们状态的假设
- 不要假设他们疲倦、有压力或精疲力竭，除非他们明确说明
- 只根据用户实际说的话回应，而不是根据一天中的时间

给一个实用建议（1-2句话），要：
- 直接回应他们的感受/需求
- 将健康与生产力和工作表现联系起来
- 激励和赋能，同时保持安全性
- 匹配他们的能量（如果压力大就冷静，如果需要动力就充满活力）

运动建议："试试这个：[动作] - 这会帮助你[生产力益处]"
其他建议：以动作动词开头 + 生产力联系

在提供了用户名时自然地使用它。做他们的健康伙伴，而不仅仅是教练。`
};

const CONTEXT_TEMPLATE = {
  timeOfDay: {
    morning: 'User is starting their day',
    afternoon: 'User is in the middle of their workday',
    evening: 'User is winding down'
  },
  patterns: {
    recurring: 'This issue happens frequently at this time',
    new: 'This is a new concern',
    improving: 'This has been getting better'
  }
};

const WELLNESS_PATTERNS = {
  // Physical issues
  back_pain: ['back', 'spine', 'lower back', 'upper back'],
  neck_pain: ['neck', 'shoulders', 'trapezius'],
  eye_strain: ['eyes', 'screen', 'blurry', 'headache'],
  fatigue: ['tired', 'exhausted', 'sleepy', 'fatigue'],
  
  // Mental/Work issues
  stress: ['stressed', 'anxious', 'overwhelmed', 'pressure'],
  focus: ['focus', 'concentrate', 'distracted', 'attention'],
  motivation: ['unmotivated', 'lazy', 'procrastinating', 'bored'],
  
  // Positive
  good: ['good', 'great', 'fine', 'okay', 'well']
};

const QUICK_ACTIONS = {
  back_pain: {
    title: "Quick Back Relief",
    options: [
      { id: 'cat_cow', label: 'Cat-Cow Stretch', duration: '1 min' },
      { id: 'twist', label: 'Seated Twist', duration: '30 sec' },
      { id: 'walk', label: 'Quick Walk', duration: '2 min' }
    ]
  },
  stress: {
    title: "Stress Relief",
    options: [
      { id: 'breathe', label: 'Deep Breathing', duration: '1 min' },
      { id: 'shoulders', label: 'Shoulder Rolls', duration: '30 sec' },
      { id: 'mindful', label: 'Mindful Moment', duration: '2 min' }
    ]
  }
};

const FALLBACK_RESPONSES = {
  en: {
    back_pain: "Try this: Stand up, hands on lower back, arch gently 3 times - it'll release tension and help you sit comfortably for focused work. Cat-cow stretches boost productivity by 20%!",
    stress: "Take 5 deep belly breaths right now - it'll reset your mind for clearer thinking. Roll shoulders back 10 times. You've got this, and you'll tackle that task better after!",
    fatigue: "Stand up and do 10 arm circles - it'll wake up your brain for sharper focus. Deep breaths and water will energize you to power through your work!",
    focus: "Try 20-20-20: Look 20 feet away for 20 seconds - it'll refresh your eyes for better screen work. Gentle neck rolls prevent tension headaches that kill productivity.",
    positive: "Fantastic energy! Quick stretch to maintain this momentum - it'll help you stay in the zone and crush your goals today!",
    general: "Stand up and stretch for 30 seconds - it'll boost your energy and help you work smarter, not harder. Your productivity will thank you!"
  },
  es: {
    back_pain: "Prueba esto: Levántate, manos en espalda baja, arquea suavemente 3x - liberará tensión y te ayudará a trabajar cómodamente. ¡El estiramiento gato-vaca aumenta la productividad un 20%!",
    stress: "Toma 5 respiraciones profundas ahora - reiniciará tu mente para pensar más claro. Gira hombros 10x. ¡Puedes con esto, y trabajarás mejor después!",
    fatigue: "Levántate, haz 10 círculos con brazos - despertará tu cerebro para mejor enfoque. ¡Respiración profunda y agua te energizarán para rendir al máximo!",
    focus: "Prueba 20-20-20: Mira a 20 pies por 20 segundos - refrescará tus ojos para mejor trabajo en pantalla. Los giros de cuello previenen dolores que matan la productividad.",
    positive: "¡Energía fantástica! Estiramiento rápido para mantener este impulso - te ayudará a mantener el ritmo y lograr tus metas hoy!",
    general: "Levántate y estírate 30 segundos - aumentará tu energía y te ayudará a trabajar más inteligentemente. ¡Tu productividad te lo agradecerá!"
  },
  zh: {
    back_pain: "试试这个：站起来，双手放下背，轻轻后弯3次 - 这会释放紧张，帮你舒适工作提高专注。猫牛式能提升20%生产力！",
    stress: "现在深呼吸5次 - 这会重置你的思维，让你思考更清晰。肩膀后转10次。你能行的，之后工作会更出色！",
    fatigue: "站起来手臂画圈10次 - 这会唤醒大脑，让你更专注。深呼吸加喝水会让你充满能量，高效完成工作！",
    focus: "试试20-20-20法则：看20英尺外20秒 - 这会让眼睛恢复，更好地进行屏幕工作。颈部转动防止影响生产力的头痛。",
    positive: "能量满满！快速伸展保持这种势头 - 这会帮你保持状态，今天达成所有目标！",
    general: "站起来伸展30秒 - 这会提升能量，让你更聪明地工作而不是更辛苦。你的生产力会因此提升！"
  }
};

export interface EnhancedPromptContext {
  userInput: string;
  userContext: UserContext;
  conversationHistory: ConversationMessage[];
  failedSuggestions: string[];
  successfulSuggestions: string[];
  isFollowUp: boolean;
  currentSentiment?: 'positive' | 'negative' | 'neutral';
  memoryContext?: string;
}

export class PromptManager {
  buildEnhancedPrompt(context: EnhancedPromptContext): string {
    const language = context.userContext.detectedLanguage || 'en';
    const basePrompt = WELLNESS_COACH_PROMPT[language];
    
    // Build contextual information
    const contextParts: string[] = [];
    
    // Add user name if available and not empty
    if (context.userContext.userName && context.userContext.userName.trim()) {
      contextParts.push(`User's name: ${context.userContext.userName}`);
    }
    
    // Add conversation history if this is a follow-up
    if (context.isFollowUp && context.conversationHistory.length > 0) {
      const recentExchange = this.formatRecentExchange(context.conversationHistory, language);
      contextParts.push(`CONVERSATION CONTEXT:\n${recentExchange}`);
    }
    
    // Add sentiment-based context
    if (context.currentSentiment === 'negative' && context.failedSuggestions.length > 0) {
      const failedList = context.failedSuggestions.slice(-3).join(', ');
      contextParts.push(this.getFailedSuggestionContext(failedList, language));
    }
    
    // Add successful solutions if available
    if (context.successfulSuggestions.length > 0) {
      const successList = context.successfulSuggestions.slice(-3).join(', ');
      contextParts.push(this.getSuccessfulSuggestionContext(successList, language));
    }
    
    // Add time-based context
    contextParts.push(this.getTimeContext(context.userContext.timeOfDay, language));
    
    // Add memory context if available
    if (context.memoryContext) {
      contextParts.push(context.memoryContext);
    }
    
    // Add specific instructions for follow-up scenarios
    if (context.isFollowUp && context.currentSentiment === 'negative') {
      contextParts.push(this.getNegativeFeedbackInstructions(language));
    }
    
    // Build the complete context string
    const fullContext = contextParts.join('\n');
    
    // Replace the context placeholder in the base prompt
    return basePrompt.replace('{context}', fullContext);
  }
  
  private formatRecentExchange(messages: ConversationMessage[], language: string): string {
    const recent = messages.slice(-4); // Last 2 exchanges
    const formatted = recent.map(msg => {
      const role = msg.role === 'user' ? this.getUserLabel(language) : this.getAssistantLabel(language);
      return `${role}: ${msg.content}`;
    }).join('\n');
    
    return formatted;
  }
  
  private getUserLabel(language: string): string {
    return {
      en: 'User',
      es: 'Usuario',
      zh: '用户'
    }[language] || 'User';
  }
  
  private getAssistantLabel(language: string): string {
    return {
      en: 'Coach',
      es: 'Entrenador',
      zh: '教练'
    }[language] || 'Coach';
  }
  
  private getFailedSuggestionContext(failed: string, language: string): string {
    const templates = {
      en: `Previous suggestions that didn't help: ${failed}. Avoid these approaches.`,
      es: `Sugerencias anteriores que no ayudaron: ${failed}. Evita estos enfoques.`,
      zh: `之前没有帮助的建议：${failed}。避免这些方法。`
    };
    
    return templates[language] || templates.en;
  }
  
  private getSuccessfulSuggestionContext(successful: string, language: string): string {
    const templates = {
      en: `What has worked before: ${successful}. Consider similar approaches.`,
      es: `Lo que ha funcionado antes: ${successful}. Considera enfoques similares.`,
      zh: `之前有效的方法：${successful}。考虑类似的方法。`
    };
    
    return templates[language] || templates.en;
  }
  
  private getTimeContext(timeOfDay: string, language: string): string {
    const templates = {
      en: {
        morning: 'Current time: morning',
        afternoon: 'Current time: afternoon',
        evening: 'Current time: evening'
      },
      es: {
        morning: 'Hora actual: mañana',
        afternoon: 'Hora actual: tarde',
        evening: 'Hora actual: noche'
      },
      zh: {
        morning: '当前时间：早上',
        afternoon: '当前时间：下午',
        evening: '当前时间：晚上'
      }
    };
    
    return templates[language]?.[timeOfDay] || templates.en[timeOfDay];
  }
  
  private getNegativeFeedbackInstructions(language: string): string {
    const instructions = {
      en: `IMPORTANT: The user indicated the previous suggestion didn't help. Acknowledge this and offer a completely different approach. Show understanding and adapt.`,
      es: `IMPORTANTE: El usuario indicó que la sugerencia anterior no ayudó. Reconoce esto y ofrece un enfoque completamente diferente. Muestra comprensión y adapta.`,
      zh: `重要：用户表示之前的建议没有帮助。承认这一点并提供完全不同的方法。表示理解并适应。`
    };
    
    return instructions[language] || instructions.en;
  }
  
  generateAlternativeSuggestion(
    originalIssue: string,
    failedApproach: string,
    language: string
  ): string {
    // This method generates alternative suggestions when the first one didn't work
    const category = this.categorizeIssue(originalIssue);
    
    const alternatives = {
      en: {
        back_pain: {
          physical: "Since stretching didn't help, try heat therapy for 15 minutes - it'll relax muscles so you can work pain-free and maintain focus. Comfort equals productivity!",
          positional: "Let's reset: Lie on your back, knees bent, for 2 minutes - it'll decompress your spine and help you return to work refreshed and alert.",
          support: "Try a rolled towel behind your lower back - it'll support proper posture so you can work longer without pain disrupting your flow."
        },
        stress: {
          breathing: "If breathing isn't working, try progressive muscle relaxation - tense and release each muscle for 5 seconds. It'll clear mental fog for better decision-making!",
          movement: "Let's shift gears: 2-minute walk right now - movement resets your stress hormones and boosts creative problem-solving by 60%!",
          sensory: "Try 5-4-3-2-1 grounding: Name 5 things you see, 4 you hear, 3 you feel, 2 you smell, 1 you taste - it'll anchor you for laser focus."
        },
        fatigue: {
          energy: "Since movement didn't work, splash cold water on face and wrists - it's nature's espresso shot! You'll feel alert and ready to tackle your tasks.",
          nutrition: "Quick energy boost: Drink a full glass of water NOW. Dehydration zaps 30% of your mental performance - hydrate to dominate!",
          light: "Boost alertness: Get near a window or bright lights for 2 minutes - light triggers your brain's wake-up chemicals for instant clarity!"
        }
      },
      es: {
        back_pain: {
          physical: "Ya que el estiramiento no ayudó, prueba calor por 15 minutos - relajará músculos para trabajar sin dolor y mantener el enfoque. ¡Comodidad es productividad!",
          positional: "Reiniciemos: Acuéstate boca arriba con rodillas dobladas 2 minutos - descomprimirá tu columna y volverás al trabajo renovado y alerta.",
          support: "Prueba una toalla enrollada en tu espalda baja - apoyará tu postura para trabajar más tiempo sin que el dolor interrumpa tu flujo."
        },
        stress: {
          breathing: "Si respirar no funciona, prueba relajación muscular progresiva - tensa y suelta cada músculo 5 segundos. ¡Despejará tu mente para mejores decisiones!",
          movement: "Cambiemos: Camina 2 minutos ahora - el movimiento reinicia hormonas del estrés y aumenta la creatividad un 60%!",
          sensory: "Prueba 5-4-3-2-1: Nombra 5 cosas que ves, 4 que oyes, 3 que sientes, 2 que hueles, 1 que saboreas - te anclará para enfoque láser."
        },
        fatigue: {
          energy: "Si el movimiento no funcionó, salpica agua fría en cara y muñecas - ¡es el espresso de la naturaleza! Estarás alerta para tus tareas.",
          nutrition: "Energía rápida: Bebe un vaso completo de agua AHORA. La deshidratación reduce 30% tu rendimiento mental - ¡hidrátate para dominar!",
          light: "Aumenta alerta: Acércate a ventana o luces brillantes 2 minutos - la luz activa químicos cerebrales para claridad instantánea!"
        }
      },
      zh: {
        back_pain: {
          physical: "既然伸展没用，试试热敷15分钟 - 这会放松肌肉让你无痛工作保持专注。舒适等于生产力！",
          positional: "重置一下：仰卧膝盖弯曲2分钟 - 这会减压脊柱，让你精神焕发地回到工作中。",
          support: "试试在下背放卷起的毛巾 - 这会支撑正确姿势，让你工作更久而不被疼痛打断。"
        },
        stress: {
          breathing: "如果呼吸不管用，试试渐进式肌肉放松 - 每个肌肉紧张放松5秒。这会清除脑雾，做出更好决策！",
          movement: "换个方式：现在就走动2分钟 - 运动重置压力激素，创造力提升60%！",
          sensory: "试试5-4-3-2-1定心法：说出5个看到的，4个听到的，3个感觉的，2个闻到的，1个尝到的 - 让你激光般专注。"
        },
        fatigue: {
          energy: "既然运动没用，用冷水洗脸和手腕 - 这是大自然的浓缩咖啡！你会警觉起来准备好应对任务。",
          nutrition: "快速补充能量：现在就喝一整杯水。脱水会降低30%的脑力 - 补水才能主宰工作！",
          light: "提升警觉：靠近窗户或明亮灯光2分钟 - 光线触发大脑清醒化学物质，瞬间清晰！"
        }
      }
    };
    
    // Select a random alternative approach
    const languageAlternatives = alternatives[language] || alternatives.en;
    const categoryAlternatives = languageAlternatives[category];
    
    if (!categoryAlternatives) {
      return this.getFallbackResponse(category, language);
    }
    
    const approaches = Object.values(categoryAlternatives) as string[];
    const randomIndex = Math.floor(Math.random() * approaches.length);
    
    return approaches[randomIndex] || this.getFallbackResponse(category, language);
  }
  
  private categorizeIssue(input: string): string {
    const lowerInput = input.toLowerCase();
    
    for (const [category, patterns] of Object.entries(WELLNESS_PATTERNS)) {
      if (patterns.some(pattern => lowerInput.includes(pattern))) {
        return category;
      }
    }
    
    return 'general';
  }
  
  private getFallbackResponse(category: string, language: string): string {
    return FALLBACK_RESPONSES[language]?.[category] || FALLBACK_RESPONSES[language]?.general || FALLBACK_RESPONSES.en.general;
  }
  
  formatResponse(response: string, context: EnhancedPromptContext): string {
    // Clean up and format the response
    let formatted = response.trim();
    
    // Ensure response starts with action verb or "Try this:" format
    if (!formatted.match(/^(Try this:|Prueba esto:|试试这个：)/i) && 
        !formatted.match(/^[A-Z][a-z]+\s/)) {
      const language = context.userContext.detectedLanguage || 'en';
      const tryPrefix = {
        en: 'Try this: ',
        es: 'Prueba esto: ',
        zh: '试试这个：'
      }[language] || 'Try this: ';
      
      formatted = tryPrefix + formatted;
    }
    
    // Do not automatically prepend names - let the AI handle greetings naturally
    // This prevents awkward constructions like "John, try this exercise..."
    
    return formatted;
  }
}

// Export singleton instance
export const promptManager = new PromptManager();

// Export templates for backward compatibility
export { WELLNESS_COACH_PROMPT, CONTEXT_TEMPLATE, WELLNESS_PATTERNS, QUICK_ACTIONS, FALLBACK_RESPONSES };