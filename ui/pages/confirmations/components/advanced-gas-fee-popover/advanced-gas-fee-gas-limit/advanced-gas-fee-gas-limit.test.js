import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react';

import { GasEstimateTypes } from '../../../../../../shared/constants/gas';
import { renderWithProvider } from '../../../../../../test/lib/render-helpers';
import mockEstimates from '../../../../../../test/data/mock-estimates.json';
import mockState from '../../../../../../test/data/mock-state.json';
import { MAX_GAS_LIMIT_DEC } from '../../../send/send.constants';
import { GasFeeContextProvider } from '../../../../../contexts/gasFee';
import configureStore from '../../../../../store/store';

import { AdvancedGasFeePopoverContextProvider } from '../context';
import { getSelectedInternalAccountFromMockState } from '../../../../../../test/jest/mocks';
import AdvancedGasFeeGasLimit from './advanced-gas-fee-gas-limit';

jest.mock('../../../../../store/actions', () => ({
  gasFeeStartPollingByNetworkClientId: jest
    .fn()
    .mockResolvedValue('pollingToken'),
  gasFeeStopPollingByPollingToken: jest.fn(),
  getNetworkConfigurationByNetworkClientId: jest
    .fn()
    .mockResolvedValue({ chainId: '0x5' }),
}));

const mockSelectedInternalAccount =
  getSelectedInternalAccountFromMockState(mockState);

const render = async (contextProps) => {
  const store = configureStore({
    metamask: {
      ...mockState.metamask,
      accounts: {
        [mockSelectedInternalAccount.address]: {
          address: mockSelectedInternalAccount.address,
          balance: '0x1F4',
        },
      },
      advancedGasFee: { '0x5': { priorityFee: 100 } },
      featureFlags: { advancedInlineGas: true },
      gasFeeEstimates:
        mockEstimates[GasEstimateTypes.feeMarket].gasFeeEstimates,
      gasFeeEstimatesByChainId: {
        ...mockState.metamask.gasFeeEstimatesByChainId,
        '0x5': {
          ...mockState.metamask.gasFeeEstimatesByChainId['0x5'],
          gasFeeEstimates:
            mockEstimates[GasEstimateTypes.feeMarket].gasFeeEstimates,
        },
      },
    },
  });

  let result;

  await act(
    async () =>
      (result = renderWithProvider(
        <GasFeeContextProvider
          transaction={{
            userFeeLevel: 'custom',
            txParams: { gas: '0x5208' },
          }}
          {...contextProps}
        >
          <AdvancedGasFeePopoverContextProvider>
            <AdvancedGasFeeGasLimit />
          </AdvancedGasFeePopoverContextProvider>
        </GasFeeContextProvider>,
        store,
      )),
  );

  return result;
};

describe('AdvancedGasFeeGasLimit', () => {
  it('should show GasLimit from transaction', async () => {
    await render();
    expect(screen.getByText('21000')).toBeInTheDocument();
  });

  it('should show input when edit link is clicked', async () => {
    await render();
    expect(document.getElementsByTagName('input')).toHaveLength(0);
    fireEvent.click(screen.queryByText('Edit'));
    expect(document.getElementsByTagName('input')[0]).toHaveValue(21000);
  });

  it('should show error if gas limit is not in range', async () => {
    await render();
    fireEvent.click(screen.queryByText('Edit'));
    fireEvent.change(document.getElementsByTagName('input')[0], {
      target: { value: 20000 },
    });
    expect(
      screen.queryByText(
        `Gas limit must be greater than 20999 and less than ${MAX_GAS_LIMIT_DEC}`,
      ),
    ).toBeInTheDocument();
    fireEvent.change(document.getElementsByTagName('input')[0], {
      target: { value: 8000000 },
    });
    expect(
      screen.queryByText(
        `Gas limit must be greater than 20999 and less than ${MAX_GAS_LIMIT_DEC}`,
      ),
    ).toBeInTheDocument();
    fireEvent.change(document.getElementsByTagName('input')[0], {
      target: { value: 7000000 },
    });
    expect(
      screen.queryByText(
        `Gas limit must be greater than 20999 and less than ${MAX_GAS_LIMIT_DEC}`,
      ),
    ).not.toBeInTheDocument();
  });

  it('should validate gas limit against minimumGasLimit it is passed to context', async () => {
    await render({ minimumGasLimit: '0x7530' });
    fireEvent.click(screen.queryByText('Edit'));
    fireEvent.change(document.getElementsByTagName('input')[0], {
      target: { value: 25000 },
    });
    expect(
      screen.queryByText(
        `Gas limit must be greater than 29999 and less than ${MAX_GAS_LIMIT_DEC}`,
      ),
    ).toBeInTheDocument();
  });
});
