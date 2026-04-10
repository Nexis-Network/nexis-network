import { DEFAULT_LOCALE, type ActiveLocale } from "@/i18n/config";

export type AuthErrorPageCopy = {
  title: string;
  message: string;
  recovery: string;
  actionHref?: string;
  actionLabel?: string;
  homeLabel: string;
  referenceLabel: string;
};

type AuthErrorTemplate = Omit<AuthErrorPageCopy, "homeLabel" | "referenceLabel">;

type LocaleAuthErrorConfig = {
  homeLabel: string;
  referenceLabel: string;
  defaultError: AuthErrorTemplate;
  errors: Record<string, AuthErrorTemplate>;
};

type ProviderAwareCopyBuilder = (providerLabel: string) => AuthErrorTemplate;

const PROVIDER_LABELS: Record<string, string> = {
  apple: "Apple",
  discord: "Discord",
  github: "GitHub",
  google: "Google",
  twitter: "X",
  x: "X",
};

const PROVIDER_ERROR_COPY: Record<ActiveLocale, ProviderAwareCopyBuilder> = {
  "en-US": (providerLabel) => ({
    title: `${providerLabel} Sign-In Error`,
    message: `${providerLabel} returned an error while trying to sign you in.`,
    recovery: `Try ${providerLabel} again. If the issue continues, use another sign-in method or contact support.`,
    actionHref: "/auth",
    actionLabel: "Try again",
  }),
  "es-ES": (providerLabel) => ({
    title: `Error de acceso con ${providerLabel}`,
    message: `${providerLabel} devolvio un error al intentar iniciar tu sesion.`,
    recovery: `Vuelve a intentarlo con ${providerLabel}. Si el problema persiste, usa otro metodo de acceso o contacta con soporte.`,
    actionHref: "/auth",
    actionLabel: "Volver a intentar",
  }),
  "zh-CN": (providerLabel) => ({
    title: `${providerLabel} 登录错误`,
    message: `${providerLabel} 在尝试让你登录时返回了错误。`,
    recovery: `请重试 ${providerLabel} 登录。如果问题持续存在，请改用其他登录方式或联系支持团队。`,
    actionHref: "/auth",
    actionLabel: "重试",
  }),
  "nl-NL": (providerLabel) => ({
    title: `${providerLabel}-aanmeldfout`,
    message: `${providerLabel} gaf een fout terug tijdens het aanmelden.`,
    recovery: `Probeer ${providerLabel} opnieuw. Blijft het probleem bestaan, gebruik dan een andere inlogmethode of neem contact op met support.`,
    actionHref: "/auth",
    actionLabel: "Opnieuw proberen",
  }),
  "ko-KR": (providerLabel) => ({
    title: `${providerLabel} 로그인 오류`,
    message: `${providerLabel} 로그인 중 오류를 반환했습니다.`,
    recovery: `${providerLabel}로 다시 시도하세요. 문제가 계속되면 다른 로그인 방법을 사용하거나 지원팀에 문의하세요.`,
    actionHref: "/auth",
    actionLabel: "다시 시도",
  }),
  "ru-RU": (providerLabel) => ({
    title: `Ошибка входа через ${providerLabel}`,
    message: `${providerLabel} вернул ошибку при попытке входа.`,
    recovery: `Попробуйте снова через ${providerLabel}. Если проблема повторится, используйте другой способ входа или обратитесь в поддержку.`,
    actionHref: "/auth",
    actionLabel: "Повторить",
  }),
};

const AUTH_ERROR_COPY: Record<ActiveLocale, LocaleAuthErrorConfig> = {
  "en-US": {
    homeLabel: "Go Home",
    referenceLabel: "Reference",
    defaultError: {
      title: "Authentication Error",
      message: "Something went wrong during authentication.",
      recovery: "Please try signing in again. If the problem persists, contact support.",
      actionHref: "/auth",
      actionLabel: "Sign in",
    },
    errors: {
      access_denied: {
        title: "Access Denied",
        message: "You do not have permission to access this resource.",
        recovery:
          "Make sure you are using the correct account, or contact support if you believe this is an error.",
        actionHref: "/auth",
        actionLabel: "Sign in with a different account",
      },
      server_error: {
        title: "Server Error",
        message: "An unexpected error occurred on our end.",
        recovery: "This is usually temporary. Please wait a moment and try again.",
        actionHref: "/auth",
        actionLabel: "Try again",
      },
      temporarily_unavailable: {
        title: "Service Temporarily Unavailable",
        message: "The authentication service is temporarily unavailable.",
        recovery: "Please try again in a few minutes. If the issue persists, check our status page.",
        actionHref: "/auth",
        actionLabel: "Try again",
      },
      unauthorized_client: {
        title: "Unauthorized Client",
        message: "The application is not authorized to perform this request.",
        recovery: "Please try signing in again. If the issue persists, contact support.",
        actionHref: "/auth",
        actionLabel: "Sign in",
      },
      invalid_request: {
        title: "Invalid Request",
        message: "The sign-in request was malformed or expired.",
        recovery: "Please try signing in again from the beginning.",
        actionHref: "/auth",
        actionLabel: "Start over",
      },
      otp_expired: {
        title: "Verification Code Expired",
        message: "Your verification code has expired.",
        recovery: "Request a new code and try again within the time limit.",
        actionHref: "/auth",
        actionLabel: "Request new code",
      },
      email_not_confirmed: {
        title: "Email Not Confirmed",
        message: "Your email address has not been verified yet.",
        recovery:
          "Check your inbox for a confirmation email. If you didn't receive one, try signing up again.",
        actionHref: "/auth",
        actionLabel: "Resend confirmation",
      },
      user_banned: {
        title: "Account Suspended",
        message: "Your account has been suspended.",
        recovery: "Please contact support for more information about your account status.",
      },
      session_expired: {
        title: "Session Expired",
        message: "Your session has expired for security reasons.",
        recovery: "Please sign in again to continue.",
        actionHref: "/auth",
        actionLabel: "Sign in",
      },
      oauth_callback_error: {
        title: "Sign-In Provider Error",
        message: "There was a problem connecting with the external sign-in provider.",
        recovery:
          "Try signing in again. If you continue to see this error, try a different sign-in method.",
        actionHref: "/auth",
        actionLabel: "Try again",
      },
      pkce_verification_failed: {
        title: "Verification Failed",
        message: "The security verification for this sign-in attempt failed.",
        recovery:
          "This can happen if you opened the link in a different browser. Please sign in again from the same browser.",
        actionHref: "/auth",
        actionLabel: "Sign in again",
      },
    },
  },
  "es-ES": {
    homeLabel: "Ir al inicio",
    referenceLabel: "Referencia",
    defaultError: {
      title: "Error de autenticación",
      message: "Algo salió mal durante la autenticación.",
      recovery: "Vuelve a iniciar sesión. Si el problema persiste, contacta con soporte.",
      actionHref: "/auth",
      actionLabel: "Iniciar sesión",
    },
    errors: {
      access_denied: {
        title: "Acceso denegado",
        message: "No tienes permiso para acceder a este recurso.",
        recovery:
          "Asegúrate de usar la cuenta correcta o contacta con soporte si crees que se trata de un error.",
        actionHref: "/auth",
        actionLabel: "Iniciar sesión con otra cuenta",
      },
      server_error: {
        title: "Error del servidor",
        message: "Ocurrió un error inesperado de nuestro lado.",
        recovery: "Suele ser temporal. Espera un momento y vuelve a intentarlo.",
        actionHref: "/auth",
        actionLabel: "Volver a intentar",
      },
      temporarily_unavailable: {
        title: "Servicio temporalmente no disponible",
        message: "El servicio de autenticación no está disponible temporalmente.",
        recovery: "Vuelve a intentarlo en unos minutos. Si persiste, revisa nuestra página de estado.",
        actionHref: "/auth",
        actionLabel: "Volver a intentar",
      },
      unauthorized_client: {
        title: "Cliente no autorizado",
        message: "La aplicación no está autorizada para realizar esta solicitud.",
        recovery: "Intenta iniciar sesión de nuevo. Si persiste, contacta con soporte.",
        actionHref: "/auth",
        actionLabel: "Iniciar sesión",
      },
      invalid_request: {
        title: "Solicitud no válida",
        message: "La solicitud de acceso era incorrecta o expiró.",
        recovery: "Vuelve a iniciar sesión desde el principio.",
        actionHref: "/auth",
        actionLabel: "Empezar de nuevo",
      },
      otp_expired: {
        title: "Código de verificación expirado",
        message: "Tu código de verificación ha expirado.",
        recovery: "Solicita uno nuevo e inténtalo dentro del plazo.",
        actionHref: "/auth",
        actionLabel: "Solicitar código nuevo",
      },
      email_not_confirmed: {
        title: "Correo no confirmado",
        message: "Tu dirección de correo todavía no ha sido verificada.",
        recovery:
          "Revisa tu bandeja de entrada para encontrar el correo de confirmación. Si no lo recibiste, intenta registrarte de nuevo.",
        actionHref: "/auth",
        actionLabel: "Reenviar confirmación",
      },
      user_banned: {
        title: "Cuenta suspendida",
        message: "Tu cuenta ha sido suspendida.",
        recovery: "Contacta con soporte para obtener más información sobre el estado de tu cuenta.",
      },
      session_expired: {
        title: "Sesión expirada",
        message: "Tu sesión expiró por motivos de seguridad.",
        recovery: "Vuelve a iniciar sesión para continuar.",
        actionHref: "/auth",
        actionLabel: "Iniciar sesión",
      },
      oauth_callback_error: {
        title: "Error del proveedor de acceso",
        message: "Hubo un problema al conectar con el proveedor externo de inicio de sesión.",
        recovery:
          "Intenta iniciar sesión de nuevo. Si sigues viendo este error, prueba otro método de acceso.",
        actionHref: "/auth",
        actionLabel: "Volver a intentar",
      },
      pkce_verification_failed: {
        title: "Verificación fallida",
        message: "Falló la verificación de seguridad para este intento de inicio de sesión.",
        recovery:
          "Esto puede ocurrir si abriste el enlace en otro navegador. Vuelve a iniciar sesión desde el mismo navegador.",
        actionHref: "/auth",
        actionLabel: "Iniciar sesión de nuevo",
      },
    },
  },
  "zh-CN": {
    homeLabel: "返回首页",
    referenceLabel: "参考代码",
    defaultError: {
      title: "身份验证错误",
      message: "身份验证过程中出现了问题。",
      recovery: "请重新登录。如果问题持续存在，请联系支持团队。",
      actionHref: "/auth",
      actionLabel: "登录",
    },
    errors: {
      access_denied: {
        title: "访问被拒绝",
        message: "你没有权限访问此资源。",
        recovery: "请确认你使用的是正确账户；如果你认为这是错误，请联系支持团队。",
        actionHref: "/auth",
        actionLabel: "使用其他账户登录",
      },
      server_error: {
        title: "服务器错误",
        message: "我们的服务端出现了意外错误。",
        recovery: "这通常是暂时性的。请稍候后重试。",
        actionHref: "/auth",
        actionLabel: "重试",
      },
      temporarily_unavailable: {
        title: "服务暂时不可用",
        message: "身份验证服务当前暂时不可用。",
        recovery: "请几分钟后再试。如果问题持续存在，请查看我们的状态页面。",
        actionHref: "/auth",
        actionLabel: "重试",
      },
      unauthorized_client: {
        title: "客户端未授权",
        message: "此应用无权执行该请求。",
        recovery: "请重新登录。如果问题持续存在，请联系支持团队。",
        actionHref: "/auth",
        actionLabel: "登录",
      },
      invalid_request: {
        title: "请求无效",
        message: "登录请求格式错误或已过期。",
        recovery: "请从头重新发起登录。",
        actionHref: "/auth",
        actionLabel: "重新开始",
      },
      otp_expired: {
        title: "验证码已过期",
        message: "你的验证码已过期。",
        recovery: "请重新获取验证码，并在有效时间内完成验证。",
        actionHref: "/auth",
        actionLabel: "重新获取验证码",
      },
      email_not_confirmed: {
        title: "邮箱尚未确认",
        message: "你的邮箱地址尚未完成验证。",
        recovery: "请检查收件箱中的确认邮件。如果没有收到，请重新注册。",
        actionHref: "/auth",
        actionLabel: "重新发送确认邮件",
      },
      user_banned: {
        title: "账户已暂停",
        message: "你的账户已被暂停使用。",
        recovery: "请联系支持团队以了解你的账户状态详情。",
      },
      session_expired: {
        title: "会话已过期",
        message: "出于安全原因，你的会话已过期。",
        recovery: "请重新登录后继续。",
        actionHref: "/auth",
        actionLabel: "登录",
      },
      oauth_callback_error: {
        title: "登录提供方错误",
        message: "连接外部登录提供方时出现问题。",
        recovery: "请重试登录。如果问题持续出现，请尝试其他登录方式。",
        actionHref: "/auth",
        actionLabel: "重试",
      },
      pkce_verification_failed: {
        title: "验证失败",
        message: "本次登录尝试的安全验证失败。",
        recovery: "如果你在其他浏览器中打开了链接，可能会出现这种情况。请在同一浏览器中重新登录。",
        actionHref: "/auth",
        actionLabel: "重新登录",
      },
    },
  },
  "nl-NL": {
    homeLabel: "Ga naar home",
    referenceLabel: "Referentie",
    defaultError: {
      title: "Authenticatiefout",
      message: "Er is iets misgegaan tijdens de authenticatie.",
      recovery: "Probeer opnieuw in te loggen. Neem contact op met support als het probleem aanhoudt.",
      actionHref: "/auth",
      actionLabel: "Inloggen",
    },
    errors: {
      access_denied: {
        title: "Toegang geweigerd",
        message: "Je hebt geen toestemming om deze bron te openen.",
        recovery:
          "Controleer of je het juiste account gebruikt, of neem contact op met support als dit een fout lijkt te zijn.",
        actionHref: "/auth",
        actionLabel: "Met een ander account inloggen",
      },
      server_error: {
        title: "Serverfout",
        message: "Er is onverwacht een fout op onze server opgetreden.",
        recovery: "Dit is meestal tijdelijk. Wacht even en probeer het opnieuw.",
        actionHref: "/auth",
        actionLabel: "Opnieuw proberen",
      },
      temporarily_unavailable: {
        title: "Service tijdelijk niet beschikbaar",
        message: "De authenticatieservice is tijdelijk niet beschikbaar.",
        recovery: "Probeer het over een paar minuten opnieuw. Controleer onze statuspagina als het probleem blijft bestaan.",
        actionHref: "/auth",
        actionLabel: "Opnieuw proberen",
      },
      unauthorized_client: {
        title: "Niet-geautoriseerde client",
        message: "De applicatie is niet gemachtigd om dit verzoek uit te voeren.",
        recovery: "Probeer opnieuw in te loggen. Neem contact op met support als het probleem blijft bestaan.",
        actionHref: "/auth",
        actionLabel: "Inloggen",
      },
      invalid_request: {
        title: "Ongeldig verzoek",
        message: "Het inlogverzoek was ongeldig of verlopen.",
        recovery: "Probeer opnieuw in te loggen vanaf het begin.",
        actionHref: "/auth",
        actionLabel: "Opnieuw beginnen",
      },
      otp_expired: {
        title: "Verificatiecode verlopen",
        message: "Je verificatiecode is verlopen.",
        recovery: "Vraag een nieuwe code aan en probeer het binnen de tijdslimiet opnieuw.",
        actionHref: "/auth",
        actionLabel: "Nieuwe code aanvragen",
      },
      email_not_confirmed: {
        title: "E-mailadres niet bevestigd",
        message: "Je e-mailadres is nog niet bevestigd.",
        recovery:
          "Controleer je inbox op een bevestigingsmail. Als je niets hebt ontvangen, probeer je opnieuw aan te melden.",
        actionHref: "/auth",
        actionLabel: "Bevestiging opnieuw versturen",
      },
      user_banned: {
        title: "Account opgeschort",
        message: "Je account is opgeschort.",
        recovery: "Neem contact op met support voor meer informatie over de status van je account.",
      },
      session_expired: {
        title: "Sessie verlopen",
        message: "Je sessie is om veiligheidsredenen verlopen.",
        recovery: "Log opnieuw in om verder te gaan.",
        actionHref: "/auth",
        actionLabel: "Inloggen",
      },
      oauth_callback_error: {
        title: "Fout bij inlogprovider",
        message: "Er is een probleem opgetreden bij het verbinden met de externe inlogprovider.",
        recovery: "Probeer opnieuw in te loggen. Gebruik een andere methode als je deze fout blijft zien.",
        actionHref: "/auth",
        actionLabel: "Opnieuw proberen",
      },
      pkce_verification_failed: {
        title: "Verificatie mislukt",
        message: "De beveiligingscontrole voor deze inlogpoging is mislukt.",
        recovery:
          "Dit kan gebeuren als je de link in een andere browser hebt geopend. Log opnieuw in vanuit dezelfde browser.",
        actionHref: "/auth",
        actionLabel: "Opnieuw inloggen",
      },
    },
  },
  "ko-KR": {
    homeLabel: "홈으로 이동",
    referenceLabel: "참조 코드",
    defaultError: {
      title: "인증 오류",
      message: "인증 중 문제가 발생했습니다.",
      recovery: "다시 로그인해 주세요. 문제가 계속되면 지원팀에 문의하세요.",
      actionHref: "/auth",
      actionLabel: "로그인",
    },
    errors: {
      access_denied: {
        title: "접근 거부",
        message: "이 리소스에 접근할 권한이 없습니다.",
        recovery: "올바른 계정을 사용 중인지 확인하고, 오류라고 생각되면 지원팀에 문의하세요.",
        actionHref: "/auth",
        actionLabel: "다른 계정으로 로그인",
      },
      server_error: {
        title: "서버 오류",
        message: "서버 측에서 예기치 않은 오류가 발생했습니다.",
        recovery: "대부분 일시적인 문제입니다. 잠시 후 다시 시도해 주세요.",
        actionHref: "/auth",
        actionLabel: "다시 시도",
      },
      temporarily_unavailable: {
        title: "서비스를 일시적으로 사용할 수 없음",
        message: "인증 서비스를 현재 일시적으로 사용할 수 없습니다.",
        recovery: "몇 분 후 다시 시도해 주세요. 문제가 지속되면 상태 페이지를 확인하세요.",
        actionHref: "/auth",
        actionLabel: "다시 시도",
      },
      unauthorized_client: {
        title: "인증되지 않은 클라이언트",
        message: "이 애플리케이션은 이 요청을 수행할 권한이 없습니다.",
        recovery: "다시 로그인해 주세요. 문제가 계속되면 지원팀에 문의하세요.",
        actionHref: "/auth",
        actionLabel: "로그인",
      },
      invalid_request: {
        title: "잘못된 요청",
        message: "로그인 요청 형식이 잘못되었거나 만료되었습니다.",
        recovery: "처음부터 다시 로그인해 주세요.",
        actionHref: "/auth",
        actionLabel: "처음부터 다시 시작",
      },
      otp_expired: {
        title: "인증 코드 만료",
        message: "인증 코드가 만료되었습니다.",
        recovery: "새 코드를 요청한 뒤 제한 시간 안에 다시 시도해 주세요.",
        actionHref: "/auth",
        actionLabel: "새 코드 요청",
      },
      email_not_confirmed: {
        title: "이메일 미확인",
        message: "이메일 주소가 아직 확인되지 않았습니다.",
        recovery: "확인 메일이 도착했는지 받은편지함을 확인하세요. 메일이 없다면 다시 가입해 보세요.",
        actionHref: "/auth",
        actionLabel: "확인 메일 다시 보내기",
      },
      user_banned: {
        title: "계정 정지",
        message: "계정이 정지되었습니다.",
        recovery: "계정 상태에 대한 자세한 내용은 지원팀에 문의하세요.",
      },
      session_expired: {
        title: "세션 만료",
        message: "보안상의 이유로 세션이 만료되었습니다.",
        recovery: "계속하려면 다시 로그인해 주세요.",
        actionHref: "/auth",
        actionLabel: "로그인",
      },
      oauth_callback_error: {
        title: "로그인 제공자 오류",
        message: "외부 로그인 제공자와 연결하는 중 문제가 발생했습니다.",
        recovery: "다시 로그인해 보세요. 이 오류가 계속되면 다른 로그인 방법을 사용하세요.",
        actionHref: "/auth",
        actionLabel: "다시 시도",
      },
      pkce_verification_failed: {
        title: "검증 실패",
        message: "이번 로그인 시도의 보안 검증에 실패했습니다.",
        recovery: "링크를 다른 브라우저에서 열면 이런 일이 발생할 수 있습니다. 같은 브라우저에서 다시 로그인해 주세요.",
        actionHref: "/auth",
        actionLabel: "다시 로그인",
      },
    },
  },
  "ru-RU": {
    homeLabel: "На главную",
    referenceLabel: "Ссылка",
    defaultError: {
      title: "Ошибка аутентификации",
      message: "Во время аутентификации что-то пошло не так.",
      recovery: "Попробуйте войти снова. Если проблема сохранится, обратитесь в поддержку.",
      actionHref: "/auth",
      actionLabel: "Войти",
    },
    errors: {
      access_denied: {
        title: "Доступ запрещен",
        message: "У вас нет прав на доступ к этому ресурсу.",
        recovery:
          "Убедитесь, что используете правильный аккаунт. Если это похоже на ошибку, свяжитесь с поддержкой.",
        actionHref: "/auth",
        actionLabel: "Войти с другим аккаунтом",
      },
      server_error: {
        title: "Ошибка сервера",
        message: "На нашей стороне произошла непредвиденная ошибка.",
        recovery: "Обычно это временно. Подождите немного и попробуйте снова.",
        actionHref: "/auth",
        actionLabel: "Повторить",
      },
      temporarily_unavailable: {
        title: "Сервис временно недоступен",
        message: "Сервис аутентификации временно недоступен.",
        recovery: "Попробуйте снова через несколько минут. Если проблема сохранится, проверьте страницу статуса.",
        actionHref: "/auth",
        actionLabel: "Повторить",
      },
      unauthorized_client: {
        title: "Неавторизованный клиент",
        message: "Приложение не авторизовано для выполнения этого запроса.",
        recovery: "Попробуйте войти снова. Если проблема сохранится, обратитесь в поддержку.",
        actionHref: "/auth",
        actionLabel: "Войти",
      },
      invalid_request: {
        title: "Недопустимый запрос",
        message: "Запрос на вход был некорректным или истек.",
        recovery: "Начните вход заново с самого начала.",
        actionHref: "/auth",
        actionLabel: "Начать заново",
      },
      otp_expired: {
        title: "Код подтверждения истек",
        message: "Ваш код подтверждения истек.",
        recovery: "Запросите новый код и попробуйте снова в пределах срока действия.",
        actionHref: "/auth",
        actionLabel: "Запросить новый код",
      },
      email_not_confirmed: {
        title: "Email не подтвержден",
        message: "Ваш адрес электронной почты еще не подтвержден.",
        recovery:
          "Проверьте входящие на наличие письма подтверждения. Если вы его не получили, попробуйте зарегистрироваться снова.",
        actionHref: "/auth",
        actionLabel: "Отправить подтверждение снова",
      },
      user_banned: {
        title: "Аккаунт приостановлен",
        message: "Ваш аккаунт был приостановлен.",
        recovery: "Свяжитесь с поддержкой, чтобы узнать подробности о статусе аккаунта.",
      },
      session_expired: {
        title: "Сессия истекла",
        message: "Ваша сессия истекла по соображениям безопасности.",
        recovery: "Войдите снова, чтобы продолжить.",
        actionHref: "/auth",
        actionLabel: "Войти",
      },
      oauth_callback_error: {
        title: "Ошибка провайдера входа",
        message: "Возникла проблема при подключении к внешнему провайдеру входа.",
        recovery: "Попробуйте войти снова. Если ошибка повторяется, используйте другой способ входа.",
        actionHref: "/auth",
        actionLabel: "Повторить",
      },
      pkce_verification_failed: {
        title: "Проверка не пройдена",
        message: "Проверка безопасности для этой попытки входа не удалась.",
        recovery:
          "Это может случиться, если вы открыли ссылку в другом браузере. Войдите снова в том же браузере.",
        actionHref: "/auth",
        actionLabel: "Войти снова",
      },
    },
  },
};

function normalizeErrorCode(code: string | undefined | null) {
  return code?.trim().toLowerCase().replace(/[\s-]+/g, "_") ?? "";
}

function normalizeProvider(provider: string | undefined | null): string {
  return provider?.trim().toLowerCase().replace(/[\s-]+/g, "_") ?? "";
}

function resolveProviderLabel(provider: string | undefined | null): string | null {
  const normalizedProvider = normalizeProvider(provider);
  if (!normalizedProvider) {
    return null;
  }

  if (PROVIDER_LABELS[normalizedProvider]) {
    return PROVIDER_LABELS[normalizedProvider];
  }

  return normalizedProvider
    .split(/[_-]+/u)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function resolveAuthErrorCopy(
  locale: ActiveLocale,
  code?: string | null,
  provider?: string | null,
): AuthErrorPageCopy {
  const localeCopy = AUTH_ERROR_COPY[locale] ?? AUTH_ERROR_COPY[DEFAULT_LOCALE];
  const normalizedCode = normalizeErrorCode(code);
  const lookupCode = normalizedCode.startsWith("provider_")
    ? "oauth_callback_error"
    : normalizedCode;
  const providerLabel = resolveProviderLabel(provider);
  const providerAwareError =
    providerLabel && lookupCode === "oauth_callback_error"
      ? (PROVIDER_ERROR_COPY[locale] ?? PROVIDER_ERROR_COPY[DEFAULT_LOCALE])(providerLabel)
      : null;
  const resolved =
    providerAwareError ??
    localeCopy.errors[lookupCode] ??
    localeCopy.defaultError;

  return {
    ...resolved,
    homeLabel: localeCopy.homeLabel,
    referenceLabel: localeCopy.referenceLabel,
  };
}
