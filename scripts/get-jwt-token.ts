import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

interface AuthResponse {
  token: string;
  userId: string;
}

/**
 * Получает JWT токен через VK Silent Auth
 * Для тестирования используется dummy VK токен
 */
async function getJWTToken(vkToken?: string): Promise<string> {
  const token = vkToken || 'dummy-vk-token-for-development';

  console.log('🔐 Получение JWT токена...\n');
  console.log(`📍 API: ${API_URL}/auth/vk`);
  console.log(`📱 VK Token: ${token.substring(0, 20)}...\n`);

  try {
    const response = await axios.post<AuthResponse>(`${API_URL}/auth/vk`, {
      token,
    });

    const { token: jwtToken, userId } = response.data;

    console.log('✅ Успешно получен JWT токен!\n');
    console.log(`👤 User ID: ${userId}`);
    console.log(`🔑 JWT Token: ${jwtToken.substring(0, 50)}...\n`);
    console.log('📋 Полный токен для использования в скриптах:\n');
    console.log(jwtToken);
    console.log('\n');

    return jwtToken;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Ошибка авторизации:');
      console.error(`   Статус: ${error.response?.status}`);
      console.error(`   Ошибка: ${error.response?.data?.error || error.message}`);
    } else {
      console.error('❌ Ошибка:', error instanceof Error ? error.message : String(error));
    }
    throw error;
  }
}

/**
 * Проверяет, доступен ли backend
 */
async function checkBackend(): Promise<boolean> {
  try {
    await axios.get(`${API_URL}/health`, { timeout: 5000 }).catch(() => {
      // Endpoint может не существовать, но проверим connection
    });
    console.log(`✅ Backend доступен: ${API_URL}\n`);
    return true;
  } catch (error) {
    console.error(`❌ Backend недоступен: ${API_URL}`);
    console.error('   Убедитесь, что запущен: cd backend && npm run dev\n');
    return false;
  }
}

async function main() {
  console.clear();
  console.log('🔐 CRM4Max — Получение JWT токена\n');

  const backendAvailable = await checkBackend();
  if (!backendAvailable) {
    process.exit(1);
  }

  try {
    const token = await getJWTToken(process.argv[2]);
    console.log('💡 Использование токена:\n');
    console.log('  PowerShell:');
    console.log(`  $env:JWT_TOKEN="${token}"`);
    console.log(`  tsx upload-service-images.ts $env:JWT_TOKEN\n`);
    console.log('  Bash:');
    console.log(`  export JWT_TOKEN="${token}"`);
    console.log(`  tsx upload-service-images.ts $JWT_TOKEN\n`);
  } catch (error) {
    process.exit(1);
  }
}

main();
