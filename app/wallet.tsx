import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_GRADIENT } from '@/constants/Gradients';
import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Alert , Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LineChart } from 'react-native-chart-kit';
import ArrowLeftIcon from '../assets/icons/arrow-left.svg';
import WalletIcon from '../assets/icons/wallet.svg';
import CoinsIcon from '../assets/icons/coins.svg';
import WithdrawIcon from '../assets/icons/withdraw.svg';
import TransactionIcon from '../assets/icons/transaction.svg';
import IdentityIcon from '../assets/icons/identity.svg';
import ChevronDownIcon from '../assets/icons/chevron-down.svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useGetWalletSummaryQuery, useGetWalletAnalyticsQuery } from '../src/api/walletApi';

type AnalyticsFilterOption = {
  label: string;
  value: string;
  calculateRewards: (walletData: any, analyticsData: any) => {
    totalRewards: string;
    periodRewards: string;
  };
};

const WalletScreen = () => {
  const router = useRouter();
  const screenWidth = Dimensions.get('window').width;
  const [selectedAnalyticsFilter, setSelectedAnalyticsFilter] = useState('year');
  const [isAnalyticsFilterModalVisible, setAnalyticsFilterModalVisible] = useState(false);

    // Fetch wallet data from backend
  const { data: walletData, isLoading, error, refetch } = useGetWalletSummaryQuery();
  const { data: walletAnalytics, isLoading: analyticsLoading, error: analyticsError } = useGetWalletAnalyticsQuery();

  // Analytics filter options
  const analyticsFilterOptions: AnalyticsFilterOption[] = [
    {
      label: 'This Week',
      value: 'week',
      calculateRewards: (walletData, analyticsData) => {
        // For this week, we'll use a portion of this month's earnings
        const thisMonthEarned = Number(analyticsData?.this_month_earned) || 0;
        const weekMultiplier = 0.25; // Roughly 1/4 of the month
        const totalEarned = Number(analyticsData?.total_earned) || 0;
        return {
          totalRewards: `${totalEarned.toFixed(0)} Riz`,
          periodRewards: `${(thisMonthEarned * weekMultiplier).toFixed(0)} Riz`
        };
      }
    },
    {
      label: 'This Month',
      value: 'month',
      calculateRewards: (walletData, analyticsData) => {
        const totalEarned = Number(analyticsData?.total_earned) || 0;
        const thisMonthEarned = Number(analyticsData?.this_month_earned) || 0;
        return {
          totalRewards: `${totalEarned.toFixed(0)} Riz`,
          periodRewards: `${thisMonthEarned.toFixed(0)} Riz`
        };
      }
    },
    {
      label: 'Last 3 Months',
      value: '3months',
      calculateRewards: (walletData, analyticsData) => {
        // Sum the last 3 months from monthly data
        const monthlyData = analyticsData?.monthly_data || [];
        const lastThreeMonths = monthlyData.slice(-3);
        const threeMonthsEarnings = lastThreeMonths.reduce((sum: number, month: any) => sum + month.earnings, 0);
        const totalEarned = Number(analyticsData?.total_earned) || 0;
        return {
          totalRewards: `${totalEarned.toFixed(0)} Riz`,
          periodRewards: `${threeMonthsEarnings.toFixed(0)} Riz`
        };
      }
    },
    {
      label: 'This Year',
      value: 'year',
      calculateRewards: (walletData, analyticsData) => {
        const totalEarned = Number(analyticsData?.total_earned) || 0;
        // For this year, we could calculate from monthly data or use a portion
        const yearlyEarnings = Number(analyticsData?.total_earned) || 0; // Using total for now
        return {
          totalRewards: `${totalEarned.toFixed(0)} Riz`,
          periodRewards: `${yearlyEarnings.toFixed(0)} Riz`
        };
      }
    },
    {
      label: 'All Time',
      value: 'all',
      calculateRewards: (walletData, analyticsData) => {
        const totalEarned = Number(analyticsData?.total_earned) || 0;
        return {
          totalRewards: `${totalEarned.toFixed(0)} Riz`,
          periodRewards: `${totalEarned.toFixed(0)} Riz`
        };
      }
    }
  ];

  // Calculate analytics based on selected filter
  const analyticsData = useMemo(() => {
    if (!walletData) return { totalRewards: '0 Riz', periodRewards: '0 Riz' };

    try {
      const selectedOption = analyticsFilterOptions.find(option => option.value === selectedAnalyticsFilter);
      if (!selectedOption) return { totalRewards: '0 Riz', periodRewards: '0 Riz' };

      const result = selectedOption.calculateRewards(walletData, walletAnalytics);
      return result || { totalRewards: '0 Riz', periodRewards: '0 Riz' };
    } catch (error) {
      return { totalRewards: '0 Riz', periodRewards: '0 Riz' };
    }
  }, [walletData, selectedAnalyticsFilter, walletAnalytics]);

  const currentFilterLabel = analyticsFilterOptions.find(option => option.value === selectedAnalyticsFilter)?.label || 'This Year';
  const periodLabel = selectedAnalyticsFilter === 'all' ? 'All time rewards' :
                     selectedAnalyticsFilter === 'year' ? 'This year\'s rewards' :
                     selectedAnalyticsFilter === 'month' ? 'This month\'s rewards' :
                     selectedAnalyticsFilter === 'week' ? 'This week\'s rewards' :
                     selectedAnalyticsFilter === '3months' ? 'Last 3 months\' rewards' : 'Period rewards';

  // Generate chart data from analytics monthly data with period filtering
  const chartData = useMemo(() => {
    if (!walletAnalytics?.monthly_data || walletAnalytics.monthly_data.length === 0) {
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          data: [0, 0, 0, 0, 0, 0],
        }]
      };
    }

    const monthlyData = walletAnalytics.monthly_data;

    // Filter monthly data based on selected analytics period
    let filteredData = monthlyData;

    switch (selectedAnalyticsFilter) {
      case 'week':
        // For "This Week", show only the current month data (since we don't have weekly granularity)
        filteredData = monthlyData.slice(-1); // Last month only
        break;

      case 'month':
        // For "This Month", show only the current month data
        filteredData = monthlyData.slice(-1); // Last month only
        break;

      case '3months':
        // For "Last 3 Months", show last 3 months
        filteredData = monthlyData.slice(-3);
        break;

      case 'year':
        // For "This Year", show last 12 months (full year view)
        filteredData = monthlyData.slice(-12);
        break;

      case 'all':
      default:
        // For "All Time", show all available data
        filteredData = monthlyData;
        break;
    }

    // Backend already sends month abbreviations (Jan, Feb, etc.), no need to parse as date
    const labels = filteredData.map(item => item.month);
    const data = filteredData.map(item => item.earnings || 0);

    return {
      labels,
      datasets: [{ data }]
    };
  }, [walletAnalytics?.monthly_data, selectedAnalyticsFilter]);

  const chartConfig = {
    backgroundGradientFrom: '#090909',
    backgroundGradientTo: '#090909',
    color: (opacity = 1) => `rgba(255, 0, 0, ${opacity})`,
    strokeWidth: 2,
    decimalPlaces: 0,
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090909]">
      <StatusBar style="light" />
      <View className="flex-row items-center relative px-4 pt-3 pb-3 mb-6">
        <TouchableOpacity onPress={() => router.back()} className="absolute left-4 z-10">
          <View className="w-14 h-14 bg-[#1A1A1A] rounded-full justify-center items-center">
            <ArrowLeftIcon width={24} height={24}/>
          </View>
        </TouchableOpacity>
        <View className="flex-1 items-center">
          <Text className="text-white text-[20px] font-semibold">Wallet</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4">
        <View className="rounded-xl overflow-hidden mb-6">
        <LinearGradient
            colors={BRAND_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
          <View className="p-6">
            <Text className="text-white text-sm mb-1">Wallet Balance</Text>
            <View className="flex-row items-center justify-between">
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : error ? (
                <Text className="text-red-400 text-lg">Error loading balance</Text>
              ) : (
                <Text className="text-white text-3xl font-bold">
                  {walletData?.balance ? `${Number(walletData.balance).toFixed(0)} Naira` : '0 Naira'}
                </Text>
              )}
              <WalletIcon width={50} height={50} className="ml-2" />
            </View>
            <Text className="text-white/70 text-sm mt-1">
              {walletData?.coins_equivalent_text?.replace(/coins?/gi, 'Riz') || '~ 0 Riz'}
            </Text>
          </View>
          </LinearGradient>
        </View>

        <Text className="text-white text-xl font-semibold mb-4">Actions</Text>
          <View className="flex-row flex-wrap justify-between">
            <TouchableOpacity
              className="bg-[#262626] rounded-2xl p-4 w-[48%] mb-4"
              onPress={() => router.push('/get-coins')}
            >
              <View className="gap-1">
                <View className="w-14 h-14 bg-[#3D3E3F] rounded-full justify-center items-center mb-2">
                  <CoinsIcon width={24} height={24} className="ml-2 bg-gray-600 rounded-full p-1" />
                </View>
                <Text className="text-white text-base font-semibold">Get Riz</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-[#262626] rounded-2xl p-4 w-[48%] mb-4"
              onPress={() => router.push('/withdraw-money')}
            >
              <View className="gap-1">
                <View className="w-14 h-14 bg-[#3D3E3F] rounded-full justify-center items-center mb-2">
                  <WithdrawIcon width={24} height={24} />
                </View>
                <Text className="text-white text-base font-semibold">Withdraw Money</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-[#262626] rounded-2xl p-4 w-[48%]"
              onPress={() => router.push('/transactions')}
            >
              <View className="gap-1">
                <View className="w-14 h-14 bg-[#3D3E3F] rounded-full justify-center items-center mb-2">
                  <TransactionIcon width={24} height={24} />
                </View>
                <Text className="text-white text-base font-semibold">View transactions</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-[#262626] rounded-2xl p-4 w-[48%] opacity-50"
              onPress={() => {
                Alert.alert('Coming Soon', 'Identity Verification will be available in a future update.');
              }}
              disabled
            >
              <View className="gap-1">
                <View className="flex-row items-center gap-1 justify-between">
                  <View className="w-14 h-14 bg-[#3D3E3F] rounded-full justify-center items-center mb-2">
                    <IdentityIcon width={24} height={24} />
                  </View>
                  <View className="bg-gray-700 rounded-full px-4 py-1 mt-1">
                    <Text className="text-white text-base font-semibold">Coming Soon</Text>
                  </View>
                </View>
                <Text className="text-white text-base font-semibold">Identity Verification</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View className="mt-8">
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="text-white text-xl font-semibold">Analytics</Text>
                <Text className="text-gray-500 text-base">An overview of earnings/rewards</Text>
              </View>
              <TouchableOpacity
                className="bg-white rounded-lg px-4 py-2 flex-row items-center gap-2"
                onPress={() => setAnalyticsFilterModalVisible(true)}
              >
                <Text className="text-gray-800 text-base">{currentFilterLabel}</Text>
                <ChevronDownIcon />
              </TouchableOpacity>
            </View>
            <View className="mb-4">
              <View className="flex-row justify-between mb-4">
                <View className="bg-[#1A1A1A] rounded-2xl p-5 w-[48%]">
                  <Text className="text-gray-500 text-sm text-center">Total rewards</Text>
                  {isLoading || analyticsLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-white text-xl font-bold text-center">
                      {analyticsData.totalRewards}
                    </Text>
                  )}
                </View>
                <View className="bg-[#1A1A1A] rounded-2xl p-5 w-[48%]">
                  <Text className="text-gray-500 text-sm text-center">{periodLabel}</Text>
                  {isLoading || analyticsLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-white text-xl font-bold text-center">
                      {analyticsData.periodRewards}
                    </Text>
                  )}
                </View>
              </View>
              {analyticsLoading ? (
                <View className="h-[220px] justify-center items-center">
                  <ActivityIndicator size="large" color="#FF0000" />
                  <Text className="text-gray-400 mt-2">Loading chart data...</Text>
                </View>
              ) : analyticsError ? (
                <View className="h-[220px] justify-center items-center">
                  <Text className="text-red-400 text-center">Failed to load chart data</Text>
                </View>
              ) : (
                <LineChart
                  data={chartData}
                  width={screenWidth - 0}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  withVerticalLines={false}
                  withHorizontalLines={true}
                  withVerticalLabels={true}
                  withHorizontalLabels={true}
                  style={{
                    marginVertical: 8,
                    borderRadius: 16,
                  }}
                />
              )}
          </View>
        </View>
      </ScrollView>

      {/* Analytics Filter Modal */}
      <Modal
        visible={isAnalyticsFilterModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAnalyticsFilterModalVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-end"
          activeOpacity={1}
          onPress={() => setAnalyticsFilterModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="bg-[#1A1A1A] rounded-t-3xl p-4"
            onPress={() => {}}
          >
            <View className="w-12 h-1 bg-gray-600 rounded-full self-center mb-4" />
            <Text className="text-white text-lg font-semibold mb-4 text-center">Analytics Period</Text>

            {analyticsFilterOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  setSelectedAnalyticsFilter(option.value);
                  setAnalyticsFilterModalVisible(false);
                }}
                className={`flex-row items-center justify-between p-4 rounded-lg mb-2 ${
                  selectedAnalyticsFilter === option.value ? 'bg-[#FF0000]' : 'bg-gray-800'
                }`}
              >
                <Text className={`text-base ${
                  selectedAnalyticsFilter === option.value ? 'text-white font-semibold' : 'text-white/80'
                }`}>
                  {option.label}
                </Text>
                {selectedAnalyticsFilter === option.value && (
                  <View className="w-5 h-5 bg-white rounded-full items-center justify-center">
                    <View className="w-2 h-2 bg-[#FF0000] rounded-full" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default WalletScreen;
