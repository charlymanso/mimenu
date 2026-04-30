const ERRORS = [
  ['invalid login credentials',              'Email o contraseña incorrectos'],
  ['invalid credentials',                    'Email o contraseña incorrectos'],
  ['email not confirmed',                    'Confirma tu email antes de iniciar sesión'],
  ['user already registered',               'Ya existe una cuenta con este email'],
  ['password should be at least 6',         'La contraseña debe tener mínimo 6 caracteres'],
  ['password should contain',               'La contraseña no cumple los requisitos mínimos'],
  ['new password should be different',      'La nueva contraseña debe ser diferente a la anterior'],
  ['unable to validate email address',      'El formato del email no es válido'],
  ['invalid email',                          'El formato del email no es válido'],
  ['email rate limit exceeded',             'Demasiados intentos. Espera unos minutos.'],
  ['over_email_send_rate_limit',            'Demasiados intentos. Espera unos minutos.'],
  ['for security purposes, you can only',   'Por seguridad, espera un momento antes de reintentar.'],
  ['token has expired or is invalid',       'El enlace ha expirado o no es válido. Solicita uno nuevo.'],
  ['auth session missing',                   'Sesión no encontrada. Inicia sesión de nuevo.'],
  ['signup is disabled',                     'El registro está desactivado temporalmente.'],
  ['user not found',                         'No existe ninguna cuenta con ese email'],
  ['network error',                          'Error de red. Comprueba tu conexión.'],
]

export function translateAuthError(msg) {
  if (!msg) return 'Ha ocurrido un error inesperado'
  const lower = msg.toLowerCase()
  for (const [pattern, translation] of ERRORS) {
    if (lower.includes(pattern)) return translation
  }
  return msg
}
