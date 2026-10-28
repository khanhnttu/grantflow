// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// node_modules/@openzeppelin/contracts/utils/Context.sol

// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

// node_modules/@openzeppelin/contracts/utils/introspection/IERC165.sol

// OpenZeppelin Contracts (last updated v5.4.0) (utils/introspection/IERC165.sol)

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol

// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/IERC20.sol)

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// node_modules/@openzeppelin/contracts/utils/StorageSlot.sol

// OpenZeppelin Contracts (last updated v5.1.0) (utils/StorageSlot.sol)
// This file was procedurally generated from scripts/generate/templates/StorageSlot.js.

/**
 * @dev Library for reading and writing primitive types to specific storage slots.
 *
 * Storage slots are often used to avoid storage conflict when dealing with upgradeable contracts.
 * This library helps with reading and writing to such slots without the need for inline assembly.
 *
 * The functions in this library return Slot structs that contain a `value` member that can be used to read or write.
 *
 * Example usage to set ERC-1967 implementation slot:
 * ```solidity
 * contract ERC1967 {
 *     // Define the slot. Alternatively, use the SlotDerivation library to derive the slot.
 *     bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
 *
 *     function _getImplementation() internal view returns (address) {
 *         return StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value;
 *     }
 *
 *     function _setImplementation(address newImplementation) internal {
 *         require(newImplementation.code.length > 0);
 *         StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value = newImplementation;
 *     }
 * }
 * ```
 *
 * TIP: Consider using this library along with {SlotDerivation}.
 */
library StorageSlot {
    struct AddressSlot {
        address value;
    }

    struct BooleanSlot {
        bool value;
    }

    struct Bytes32Slot {
        bytes32 value;
    }

    struct Uint256Slot {
        uint256 value;
    }

    struct Int256Slot {
        int256 value;
    }

    struct StringSlot {
        string value;
    }

    struct BytesSlot {
        bytes value;
    }

    /**
     * @dev Returns an `AddressSlot` with member `value` located at `slot`.
     */
    function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `BooleanSlot` with member `value` located at `slot`.
     */
    function getBooleanSlot(bytes32 slot) internal pure returns (BooleanSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Bytes32Slot` with member `value` located at `slot`.
     */
    function getBytes32Slot(bytes32 slot) internal pure returns (Bytes32Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Uint256Slot` with member `value` located at `slot`.
     */
    function getUint256Slot(bytes32 slot) internal pure returns (Uint256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Int256Slot` with member `value` located at `slot`.
     */
    function getInt256Slot(bytes32 slot) internal pure returns (Int256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `StringSlot` with member `value` located at `slot`.
     */
    function getStringSlot(bytes32 slot) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `StringSlot` representation of the string storage pointer `store`.
     */
    function getStringSlot(string storage store) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }

    /**
     * @dev Returns a `BytesSlot` with member `value` located at `slot`.
     */
    function getBytesSlot(bytes32 slot) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `BytesSlot` representation of the bytes storage pointer `store`.
     */
    function getBytesSlot(bytes storage store) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }
}

// node_modules/@openzeppelin/contracts/interfaces/IERC165.sol

// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC165.sol)

// node_modules/@openzeppelin/contracts/interfaces/IERC20.sol

// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC20.sol)

// node_modules/@openzeppelin/contracts/access/Ownable.sol

// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// node_modules/@openzeppelin/contracts/utils/ReentrancyGuard.sol

// OpenZeppelin Contracts (last updated v5.5.0) (utils/ReentrancyGuard.sol)

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 *
 * IMPORTANT: Deprecated. This storage-based reentrancy guard will be removed and replaced
 * by the {ReentrancyGuardTransient} variant in v6.0.
 *
 * @custom:stateless
 */
abstract contract ReentrancyGuard {
    using StorageSlot for bytes32;

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.ReentrancyGuard")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant REENTRANCY_GUARD_STORAGE =
        0x9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f00;

    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    /**
     * @dev A `view` only version of {nonReentrant}. Use to block view functions
     * from being called, preventing reading from inconsistent contract state.
     *
     * CAUTION: This is a "view" modifier and does not change the reentrancy
     * status. Use it only on view functions. For payable or non-payable functions,
     * use the standard {nonReentrant} modifier instead.
     */
    modifier nonReentrantView() {
        _nonReentrantBeforeView();
        _;
    }

    function _nonReentrantBeforeView() private view {
        if (_reentrancyGuardEntered()) {
            revert ReentrancyGuardReentrantCall();
        }
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        _nonReentrantBeforeView();

        // Any calls to nonReentrant after this point will fail
        _reentrancyGuardStorageSlot().getUint256Slot().value = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _reentrancyGuardStorageSlot().getUint256Slot().value == ENTERED;
    }

    function _reentrancyGuardStorageSlot() internal pure virtual returns (bytes32) {
        return REENTRANCY_GUARD_STORAGE;
    }
}

// node_modules/@openzeppelin/contracts/access/Ownable2Step.sol

// OpenZeppelin Contracts (last updated v5.1.0) (access/Ownable2Step.sol)

/**
 * @dev Contract module which provides access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * This extension of the {Ownable} contract includes a two-step mechanism to transfer
 * ownership, where the new owner must call {acceptOwnership} in order to replace the
 * old one. This can help prevent common mistakes, such as transfers of ownership to
 * incorrect accounts, or to contracts that are unable to interact with the
 * permission system.
 *
 * The initial owner is specified at deployment time in the constructor for `Ownable`. This
 * can later be changed with {transferOwnership} and {acceptOwnership}.
 *
 * This module is used through inheritance. It will make available all functions
 * from parent (Ownable).
 */
abstract contract Ownable2Step is Ownable {
    address private _pendingOwner;

    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Returns the address of the pending owner.
     */
    function pendingOwner() public view virtual returns (address) {
        return _pendingOwner;
    }

    /**
     * @dev Starts the ownership transfer of the contract to a new account. Replaces the pending transfer if there is one.
     * Can only be called by the current owner.
     *
     * Setting `newOwner` to the zero address is allowed; this can be used to cancel an initiated ownership transfer.
     */
    function transferOwnership(address newOwner) public virtual override onlyOwner {
        _pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner(), newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`) and deletes any pending owner.
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual override {
        delete _pendingOwner;
        super._transferOwnership(newOwner);
    }

    /**
     * @dev The new owner accepts the ownership transfer.
     */
    function acceptOwnership() public virtual {
        address sender = _msgSender();
        if (pendingOwner() != sender) {
            revert OwnableUnauthorizedAccount(sender);
        }
        _transferOwnership(sender);
    }
}

// node_modules/@openzeppelin/contracts/interfaces/IERC1363.sol

// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC1363.sol)

/**
 * @title IERC1363
 * @dev Interface of the ERC-1363 standard as defined in the https://eips.ethereum.org/EIPS/eip-1363[ERC-1363].
 *
 * Defines an extension interface for ERC-20 tokens that supports executing code on a recipient contract
 * after `transfer` or `transferFrom`, or code on a spender contract after `approve`, in a single transaction.
 */
interface IERC1363 is IERC20, IERC165 {
    /*
     * Note: the ERC-165 identifier for this interface is 0xb0202a11.
     * 0xb0202a11 ===
     *   bytes4(keccak256('transferAndCall(address,uint256)')) ^
     *   bytes4(keccak256('transferAndCall(address,uint256,bytes)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256,bytes)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256,bytes)'))
     */

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @param data Additional data with no specified format, sent in call to `spender`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value, bytes calldata data) external returns (bool);
}

// node_modules/@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol

// OpenZeppelin Contracts (last updated v5.5.0) (token/ERC20/utils/SafeERC20.sol)

/**
 * @title SafeERC20
 * @dev Wrappers around ERC-20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    /**
     * @dev An operation with an ERC-20 token failed.
     */
    error SafeERC20FailedOperation(address token);

    /**
     * @dev Indicates a failed `decreaseAllowance` request.
     */
    error SafeERC20FailedDecreaseAllowance(address spender, uint256 currentAllowance, uint256 requestedDecrease);

    /**
     * @dev Transfer `value` amount of `token` from the calling contract to `to`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     */
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        if (!_safeTransfer(token, to, value, true)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
     * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
     */
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        if (!_safeTransferFrom(token, from, to, value, true)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Variant of {safeTransfer} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransfer(IERC20 token, address to, uint256 value) internal returns (bool) {
        return _safeTransfer(token, to, value, false);
    }

    /**
     * @dev Variant of {safeTransferFrom} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransferFrom(IERC20 token, address from, address to, uint256 value) internal returns (bool) {
        return _safeTransferFrom(token, from, to, value, false);
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no
     * value, non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeDecreaseAllowance(IERC20 token, address spender, uint256 requestedDecrease) internal {
        unchecked {
            uint256 currentAllowance = token.allowance(address(this), spender);
            if (currentAllowance < requestedDecrease) {
                revert SafeERC20FailedDecreaseAllowance(spender, currentAllowance, requestedDecrease);
            }
            forceApprove(token, spender, currentAllowance - requestedDecrease);
        }
    }

    /**
     * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful. Meant to be used with tokens that require the approval
     * to be set to zero before setting it to a non-zero value, such as USDT.
     *
     * NOTE: If the token implements ERC-7674, this function will not modify any temporary allowance. This function
     * only sets the "standard" allowance. Any temporary allowance will remain active, in addition to the value being
     * set here.
     */
    function forceApprove(IERC20 token, address spender, uint256 value) internal {
        if (!_safeApprove(token, spender, value, false)) {
            if (!_safeApprove(token, spender, 0, true)) revert SafeERC20FailedOperation(address(token));
            if (!_safeApprove(token, spender, value, true)) revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferAndCall, with a fallback to the simple {ERC20} transfer if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that relies on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            safeTransfer(token, to, value);
        } else if (!token.transferAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferFromAndCall, with a fallback to the simple {ERC20} transferFrom if the target
     * has no code. This can be used to implement an {ERC721}-like safe transfer that relies on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferFromAndCallRelaxed(
        IERC1363 token,
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            safeTransferFrom(token, from, to, value);
        } else if (!token.transferFromAndCall(from, to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} approveAndCall, with a fallback to the simple {ERC20} approve if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * NOTE: When the recipient address (`to`) has no code (i.e. is an EOA), this function behaves as {forceApprove}.
     * Oppositely, when the recipient address (`to`) has code, this function only attempts to call {ERC1363-approveAndCall}
     * once without retrying, and relies on the returned value to be true.
     *
     * Reverts if the returned value is other than `true`.
     */
    function approveAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            forceApprove(token, to, value);
        } else if (!token.approveAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity `token.transfer(to, value)` call, relaxing the requirement on the return value: the
     * return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param to The recipient of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeTransfer(IERC20 token, address to, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = IERC20.transfer.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(to, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }

    /**
     * @dev Imitates a Solidity `token.transferFrom(from, to, value)` call, relaxing the requirement on the return
     * value: the return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param from The sender of the tokens
     * @param to The recipient of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeTransferFrom(
        IERC20 token,
        address from,
        address to,
        uint256 value,
        bool bubble
    ) private returns (bool success) {
        bytes4 selector = IERC20.transferFrom.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(from, shr(96, not(0))))
            mstore(0x24, and(to, shr(96, not(0))))
            mstore(0x44, value)
            success := call(gas(), token, 0, 0x00, 0x64, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
            mstore(0x60, 0)
        }
    }

    /**
     * @dev Imitates a Solidity `token.approve(spender, value)` call, relaxing the requirement on the return value:
     * the return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param spender The spender of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeApprove(IERC20 token, address spender, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = IERC20.approve.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(spender, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }
}

// contracts/GrantFlowV5.sol

/**
 * @title GrantFlowV5
 * @notice Ranked-prize hackathon/bounty contract with team submissions and push payouts.
 *
 * Phases per program:
 *   Submission  (block.timestamp <  submissionDeadline)
 *   Judging     (submissionDeadline <= block.timestamp < judgingDeadline)
 *   Finalized   (finalize() called after judgingDeadline)
 *
 * Prize model:
 *   prizes[] = [1st-place amount, 2nd-place amount, ...] in USDC units (6 dec).
 *   pool = sum(prizes). Fee = pool * feeBps / 10_000, sent to feeRecipient on create.
 *   Sponsor deposits pool + fee in one safeTransferFrom each.
 *
 * Team submissions:
 *   A builder may submit solo (payees = [submitter], sharesBps = [10000]) or as a
 *   team (payees = up to MAX_TEAM_SIZE members, sharesBps must sum to 10_000).
 *   Team name can be embedded in the metadataURI JSON.
 *   Each wallet address may appear in at most one submission per program (as leader
 *   or as a team member). Judges and sponsor cannot be members.
 *   In finalize(), each member receives prize * sharesBps[i] / 10_000.
 *   Rounding dust (sum of truncated amounts < prize) is given to payees[0] (leader).
 *
 * Conflict-of-interest guards:
 *   - Sponsor cannot submit / be a team member.
 *   - Judges cannot submit / be a team member.
 *   - One submission slot per wallet per program (leader or member).
 *   - Judges vote only in Judging phase; max 1 vote per submission; cannot vote
 *     on their own submission.
 *   - Each judge has exactly prizes.length votes total.
 *
 * Finalization (anyone may call after judgingDeadline):
 *   Ranks all submissions by vote count DESC, tie-broken by earlier submissionId.
 *   Only submissions with >= 1 vote can win. Assigns prizes[i] to rank i and
 *   push-pays each team member their proportional share via safeTransfer.
 *   Rounding dust goes to payees[0] (submission leader / submitter).
 *   Unawarded residual is auto-refunded to sponsor.
 *   MAX_SUBMISSIONS_PER_PROGRAM = 100 for gas safety.
 *
 * Cancel: sponsor may cancel() before any submission for a full pool refund.
 */
contract GrantFlowV5 is ReentrancyGuard, Ownable2Step {
    using SafeERC20 for IERC20;

    // ── Enums ─────────────────────────────────────────────────────────────────

    enum ProgramType { ONCHAIN_BUILD, OPEN_BOUNTY }
    enum Category    { Hackathon, Bounty, Contest, Referral }
    enum Phase       { Submission, Judging, Finalized, Cancelled }

    // ── Errors ────────────────────────────────────────────────────────────────

    error ProgramNotFound();
    error SubmissionNotFound();
    error NotJudge();
    error AlreadyVoted();
    error AlreadyPaid();
    error NotSubmissionPhase();
    error NotJudgingPhase();
    error NotFinalized();
    error AlreadyFinalized();
    error NotAfterJudgingDeadline();
    error AlreadySubmitted();
    error InvalidProjectContract();
    error InvalidParams();
    error NotSponsor();
    error FeeTooHigh();
    error ZeroAddress();
    error WrongProgramType();
    error ConflictOfInterest();
    error TooManySubmissions();
    error AlreadyCancelled();
    error SubmissionsExist();
    error AlreadyRefunded();
    error InvalidShares();      // sharesBps don't sum to 10_000
    error DuplicateMember();    // wallet appears in more than one submission slot
    error TooManyMembers();     // team exceeds MAX_TEAM_SIZE

    // ── Constants ─────────────────────────────────────────────────────────────

    uint256 public constant MAX_FEE_BPS = 500;
    uint256 public constant MAX_SUBMISSIONS_PER_PROGRAM = 100;
    uint256 public constant MAX_PRIZES = 20;   // ranks per program
    uint256 public constant MAX_TEAM_SIZE = 5; // leader + up to 4 more
    uint256 public constant SHARES_DENOM  = 10_000; // basis points denominator

    // ── Structs ───────────────────────────────────────────────────────────────

    struct Program {
        string        name;
        string        description;
        address       sponsor;
        address[]     judges;
        uint256[]     prizes;          // prizes[0] = 1st place, etc.
        uint256       totalDeposited;  // sum(prizes), fee excluded
        uint256       submissionDeadline;
        uint256       judgingDeadline;
        ProgramType   programType;
        Category      category;
        bool          exists;
        bool          finalized;
        bool          cancelled;
        bool          sponsorRefunded;
    }

    struct Submission {
        address   submitter;          // team leader / solo builder
        address   projectContract;    // address(0) for OPEN_BOUNTY
        string    metadataURI;        // team name lives in JSON here
        uint256   votes;
        uint256   prizeAwarded;       // total prize for this submission
        bool      paid;               // true after finalize pays this submission
        bool      exists;
        // Team payout split (set once at submit time, never changed)
        address[] payees;             // payees[0] == submitter (leader)
        uint256[] sharesBps;          // sharesBps[i] ∈ (0, 10_000]; sum == 10_000
    }

    // ── State ─────────────────────────────────────────────────────────────────

    IERC20 public immutable usdc;
    address public feeRecipient;
    uint256 public feeBps;
    uint256 public totalFeesCollected;
    uint256 public programCount;

    mapping(uint256 => Program)    public programs;
    mapping(uint256 => Submission[]) private _submissions;

    /// submission slot guard: leader and every team member consume one slot per program
    mapping(uint256 => mapping(address => bool)) public hasSubmitted;

    /// ONCHAIN_BUILD: one submission per deployed contract per program
    mapping(uint256 => mapping(address => bool)) public hasSubmittedContract;

    /// vote tracking
    mapping(uint256 => mapping(address => mapping(uint256 => bool))) public hasVotedOn;
    mapping(uint256 => mapping(address => uint256))                  public votesCast;

    // ── Events ────────────────────────────────────────────────────────────────

    event ProgramCreated(
        uint256 indexed programId,
        address indexed sponsor,
        string  name,
        uint256 totalPool,
        uint256 submissionDeadline,
        uint256 judgingDeadline
    );
    event ProgramUpdated(uint256 indexed programId, address indexed sponsor);
    event Submitted(
        uint256 indexed programId,
        uint256 indexed submissionId,
        address indexed submitter,
        address projectContract,
        string  metadataURI
    );
    event Voted(
        uint256 indexed programId,
        uint256 indexed submissionId,
        address indexed judge,
        uint256 totalVotes
    );
    event Finalized(uint256 indexed programId, uint256 winnerCount);
    /// Emitted once per team member per winning submission.
    event PrizePaid(
        uint256 indexed programId,
        uint256 indexed submissionId,
        address indexed recipient,
        uint256 amount,
        uint256 rank
    );
    event SponsorRefunded(uint256 indexed programId, address indexed sponsor, uint256 amount);
    event Cancelled(uint256 indexed programId, address indexed sponsor, uint256 refund);
    event FeeCollected(uint256 indexed programId, uint256 amount);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event FeeBpsUpdated(uint256 oldBps, uint256 newBps);

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address usdc_, address feeRecipient_, uint256 feeBps_)
        Ownable(msg.sender)
    {
        if (usdc_ == address(0) || feeRecipient_ == address(0)) revert ZeroAddress();
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh();
        usdc         = IERC20(usdc_);
        feeRecipient = feeRecipient_;
        feeBps       = feeBps_;
    }

    // ── Owner functions ───────────────────────────────────────────────────────

    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        emit FeeRecipientUpdated(feeRecipient, newRecipient);
        feeRecipient = newRecipient;
    }

    function setFeeBps(uint256 newBps) external onlyOwner {
        if (newBps > MAX_FEE_BPS) revert FeeTooHigh();
        emit FeeBpsUpdated(feeBps, newBps);
        feeBps = newBps;
    }

    // ── Create ────────────────────────────────────────────────────────────────

    function createProgram(
        string    calldata name_,
        string    calldata description_,
        uint256[] calldata prizes_,
        uint256   submissionDeadline_,
        uint256   judgingDeadline_,
        address[] calldata judges_,
        ProgramType programType_,
        Category    category_
    ) external returns (uint256 programId) {
        if (prizes_.length == 0 || prizes_.length > MAX_PRIZES) revert InvalidParams();
        if (submissionDeadline_ <= block.timestamp)             revert InvalidParams();
        if (judgingDeadline_ < submissionDeadline_)             revert InvalidParams();
        if (judges_.length == 0)                                revert InvalidParams();

        uint256 totalPool = 0;
        for (uint256 i = 0; i < prizes_.length; i++) {
            if (prizes_[i] == 0) revert InvalidParams();
            totalPool += prizes_[i];
        }

        uint256 fee = (totalPool * feeBps) / 10_000;

        usdc.safeTransferFrom(msg.sender, address(this), totalPool);
        if (fee > 0) {
            usdc.safeTransferFrom(msg.sender, feeRecipient, fee);
        }

        programId = programCount++;

        Program storage p = programs[programId];
        p.name               = name_;
        p.description        = description_;
        p.sponsor            = msg.sender;
        p.submissionDeadline = submissionDeadline_;
        p.judgingDeadline    = judgingDeadline_;
        p.programType        = programType_;
        p.category           = category_;
        p.totalDeposited     = totalPool;
        p.exists             = true;

        for (uint256 i = 0; i < prizes_.length; i++) p.prizes.push(prizes_[i]);
        for (uint256 i = 0; i < judges_.length;  i++) p.judges.push(judges_[i]);

        totalFeesCollected += fee;

        emit ProgramCreated(programId, msg.sender, name_, totalPool, submissionDeadline_, judgingDeadline_);
        emit FeeCollected(programId, fee);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    function updateProgram(
        uint256 programId,
        string calldata name_,
        string calldata description_,
        uint256 submissionDeadline_,
        uint256 judgingDeadline_
    ) external {
        Program storage p = programs[programId];
        if (!p.exists) revert ProgramNotFound();
        if (msg.sender != p.sponsor) revert NotSponsor();
        if (p.cancelled) revert AlreadyCancelled();
        if (p.finalized) revert AlreadyFinalized();
        if (_submissions[programId].length > 0) revert SubmissionsExist();
        if (block.timestamp >= p.submissionDeadline) revert NotSubmissionPhase();
        if (submissionDeadline_ <= block.timestamp)  revert InvalidParams();
        if (judgingDeadline_ <= submissionDeadline_) revert InvalidParams();

        p.name = name_;
        p.description = description_;
        p.submissionDeadline = submissionDeadline_;
        p.judgingDeadline = judgingDeadline_;

        emit ProgramUpdated(programId, p.sponsor);
    }

    // ── Submit ────────────────────────────────────────────────────────────────

    /**
     * @notice Submit to a program.
     * @param programId      Target program.
     * @param projectContract  address(0) for OPEN_BOUNTY; deployed contract for ONCHAIN_BUILD.
     * @param metadataURI    Link / IPFS URI for the submission. JSON may include "teamName".
     * @param payees_        Team member wallets. payees_[0] MUST equal msg.sender (leader).
     *                       Solo submission: pass [msg.sender] with sharesBps_ = [10000].
     *                       Team submission: 2–MAX_TEAM_SIZE members, sharesBps_ sum == 10_000.
     * @param sharesBps_     Prize share in basis points per member. sum MUST equal 10_000.
     */
    function submit(
        uint256 programId,
        address projectContract,
        string calldata metadataURI,
        address[] calldata payees_,
        uint256[] calldata sharesBps_
    ) external {
        Program storage p = programs[programId];
        if (!p.exists)   revert ProgramNotFound();
        if (p.cancelled) revert AlreadyCancelled();
        if (block.timestamp >= p.submissionDeadline) revert NotSubmissionPhase();
        if (_submissions[programId].length >= MAX_SUBMISSIONS_PER_PROGRAM) revert TooManySubmissions();

        // Validate team arrays
        if (payees_.length == 0 || payees_.length > MAX_TEAM_SIZE) revert InvalidParams();
        if (payees_.length != sharesBps_.length) revert InvalidParams();
        if (payees_[0] != msg.sender) revert InvalidParams(); // leader must be caller

        // Validate shares sum to 10_000
        uint256 sharesSum = 0;
        for (uint256 i = 0; i < sharesBps_.length; i++) {
            if (sharesBps_[i] == 0) revert InvalidShares();
            sharesSum += sharesBps_[i];
        }
        if (sharesSum != SHARES_DENOM) revert InvalidShares();

        // Conflict-of-interest: sponsor and judges cannot be leader OR member
        for (uint256 i = 0; i < payees_.length; i++) {
            if (payees_[i] == p.sponsor)          revert ConflictOfInterest();
            if (_isJudge(p, payees_[i]))           revert ConflictOfInterest();
        }

        // Check for zero addresses and intra-team duplicates (pairwise)
        for (uint256 i = 0; i < payees_.length; i++) {
            if (payees_[i] == address(0)) revert ZeroAddress();
            for (uint256 j = i + 1; j < payees_.length; j++) {
                if (payees_[i] == payees_[j]) revert DuplicateMember();
            }
        }

        // Cross-submission duplicate guard: each wallet can appear in only one submission per program
        for (uint256 i = 0; i < payees_.length; i++) {
            if (hasSubmitted[programId][payees_[i]]) revert AlreadySubmitted();
        }

        // ONCHAIN_BUILD checks
        if (p.programType == ProgramType.ONCHAIN_BUILD) {
            if (!_hasCode(projectContract)) revert InvalidProjectContract();
            if (hasSubmittedContract[programId][projectContract]) revert AlreadySubmitted();
            hasSubmittedContract[programId][projectContract] = true;
        } else {
            if (projectContract != address(0)) revert WrongProgramType();
        }

        // Mark all payees as submitted (consumes their slot)
        for (uint256 i = 0; i < payees_.length; i++) {
            hasSubmitted[programId][payees_[i]] = true;
        }

        // Check for duplicate wallet within same team (after marking, so first duplicate is caught)
        // Detect within-team duplicates before marking by checking pairwise
        // (already caught by hasSubmitted above on the second occurrence)

        uint256 submissionId = _submissions[programId].length;
        Submission storage sub = _submissions[programId].push();
        sub.submitter       = msg.sender;
        sub.projectContract = projectContract;
        sub.metadataURI     = metadataURI;
        sub.votes           = 0;
        sub.prizeAwarded    = 0;
        sub.paid            = false;
        sub.exists          = true;

        for (uint256 i = 0; i < payees_.length;   i++) sub.payees.push(payees_[i]);
        for (uint256 i = 0; i < sharesBps_.length; i++) sub.sharesBps.push(sharesBps_[i]);

        emit Submitted(programId, submissionId, msg.sender, projectContract, metadataURI);
    }

    // ── Vote ──────────────────────────────────────────────────────────────────

    function vote(uint256 programId, uint256 submissionId) external nonReentrant {
        Program storage p = programs[programId];
        if (!p.exists)   revert ProgramNotFound();
        if (p.cancelled) revert AlreadyCancelled();
        if (p.finalized) revert AlreadyFinalized();

        if (block.timestamp <  p.submissionDeadline) revert NotJudgingPhase();
        if (block.timestamp >= p.judgingDeadline)    revert NotJudgingPhase();

        if (!_isJudge(p, msg.sender)) revert NotJudge();

        if (submissionId >= _submissions[programId].length) revert SubmissionNotFound();
        Submission storage sub = _submissions[programId][submissionId];

        if (sub.submitter == msg.sender) revert ConflictOfInterest();
        if (hasVotedOn[programId][msg.sender][submissionId]) revert AlreadyVoted();
        if (votesCast[programId][msg.sender] >= p.prizes.length) revert InvalidParams();

        hasVotedOn[programId][msg.sender][submissionId] = true;
        votesCast[programId][msg.sender]++;
        sub.votes++;

        emit Voted(programId, submissionId, msg.sender, sub.votes);
    }

    // ── Finalize ──────────────────────────────────────────────────────────────

    /**
     * @notice Rank submissions and push-pay each member their share.
     *         Anyone may call after judgingDeadline. Idempotent check: reverts if already finalized.
     *         Rounding dust from integer division goes to payees[0] (leader).
     */
    function finalize(uint256 programId) external nonReentrant {
        Program storage p = programs[programId];
        if (!p.exists)       revert ProgramNotFound();
        if (p.cancelled)     revert AlreadyCancelled();
        if (p.finalized)     revert AlreadyFinalized();
        if (block.timestamp < p.judgingDeadline) revert NotAfterJudgingDeadline();

        p.finalized = true;

        uint256 subCount   = _submissions[programId].length;
        uint256 prizeCount = p.prizes.length;

        // Insertion sort — safe up to MAX_SUBMISSIONS=100
        uint256[] memory sorted = new uint256[](subCount);
        for (uint256 i = 0; i < subCount; i++) sorted[i] = i;

        for (uint256 i = 1; i < subCount; i++) {
            uint256 key      = sorted[i];
            uint256 keyVotes = _submissions[programId][key].votes;
            int256  j        = int256(i) - 1;
            while (j >= 0) {
                uint256 cmp      = sorted[uint256(j)];
                uint256 cmpVotes = _submissions[programId][cmp].votes;
                if (cmpVotes > keyVotes || (cmpVotes == keyVotes && cmp < key)) break;
                sorted[uint256(j + 1)] = cmp;
                j--;
            }
            sorted[uint256(j + 1)] = key;
        }

        uint256 winnerCount  = 0;
        uint256 totalAwarded = 0;

        for (uint256 rank = 0; rank < prizeCount && rank < subCount; rank++) {
            uint256 sid = sorted[rank];
            Submission storage sub = _submissions[programId][sid];
            if (sub.votes == 0) break;

            uint256 prize = p.prizes[rank];
            sub.prizeAwarded = prize;
            sub.paid = true;
            totalAwarded += prize;

            // Pay each team member their proportional share
            uint256 paidSoFar = 0;
            for (uint256 m = 1; m < sub.payees.length; m++) {
                uint256 share = (prize * sub.sharesBps[m]) / SHARES_DENOM;
                paidSoFar += share;
                usdc.safeTransfer(sub.payees[m], share);
                emit PrizePaid(programId, sid, sub.payees[m], share, rank);
            }
            // Leader (payees[0]) receives the remainder (includes any rounding dust)
            uint256 leaderShare = prize - paidSoFar;
            usdc.safeTransfer(sub.payees[0], leaderShare);
            emit PrizePaid(programId, sid, sub.payees[0], leaderShare, rank);

            winnerCount++;
        }

        uint256 residual = p.totalDeposited - totalAwarded;
        if (residual > 0) {
            usdc.safeTransfer(p.sponsor, residual);
            p.sponsorRefunded = true;
            emit SponsorRefunded(programId, p.sponsor, residual);
        }

        emit Finalized(programId, winnerCount);
    }

    // ── Cancel ────────────────────────────────────────────────────────────────

    function cancel(uint256 programId) external nonReentrant {
        Program storage p = programs[programId];
        if (!p.exists)                          revert ProgramNotFound();
        if (msg.sender != p.sponsor)            revert NotSponsor();
        if (p.cancelled)                        revert AlreadyCancelled();
        if (_submissions[programId].length > 0) revert SubmissionsExist();

        p.cancelled = true;
        uint256 refund = p.totalDeposited;
        p.totalDeposited = 0;
        usdc.safeTransfer(p.sponsor, refund);
        emit Cancelled(programId, p.sponsor, refund);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getProgram(uint256 programId)
        external view
        returns (
            string  memory name,
            string  memory description,
            address sponsor,
            uint256[] memory prizes,
            uint256 totalDeposited,
            uint256 submissionDeadline,
            uint256 judgingDeadline,
            ProgramType programType,
            Category    category,
            bool    exists,
            bool    finalized,
            bool    cancelled
        )
    {
        Program storage p = programs[programId];
        if (!p.exists) revert ProgramNotFound();
        return (
            p.name, p.description, p.sponsor, p.prizes, p.totalDeposited,
            p.submissionDeadline, p.judgingDeadline, p.programType, p.category,
            p.exists, p.finalized, p.cancelled
        );
    }

    function getJudges(uint256 programId) external view returns (address[] memory) {
        if (!programs[programId].exists) revert ProgramNotFound();
        return programs[programId].judges;
    }

    function submissionCount(uint256 programId) external view returns (uint256) {
        return _submissions[programId].length;
    }

    /**
     * @notice Read scalar fields of a submission (votes, prize, etc.).
     *         Use getSubmissionTeam() to read the payees/sharesBps arrays.
     */
    function getSubmission(uint256 programId, uint256 submissionId)
        external view
        returns (
            address submitter,
            address projectContract,
            string  memory metadataURI,
            uint256 votes,
            uint256 prizeAwarded,
            bool    paid
        )
    {
        if (!programs[programId].exists)                    revert ProgramNotFound();
        if (submissionId >= _submissions[programId].length) revert SubmissionNotFound();
        Submission storage sub = _submissions[programId][submissionId];
        return (sub.submitter, sub.projectContract, sub.metadataURI, sub.votes, sub.prizeAwarded, sub.paid);
    }

    /**
     * @notice Read the team payout arrays for a submission.
     * @return payees_    Ordered list of team member wallets (payees[0] == leader).
     * @return sharesBps_ Corresponding share in basis points (sum == 10_000).
     */
    function getSubmissionTeam(uint256 programId, uint256 submissionId)
        external view
        returns (address[] memory payees_, uint256[] memory sharesBps_)
    {
        if (!programs[programId].exists)                    revert ProgramNotFound();
        if (submissionId >= _submissions[programId].length) revert SubmissionNotFound();
        Submission storage sub = _submissions[programId][submissionId];
        return (sub.payees, sub.sharesBps);
    }

    function isJudge(uint256 programId, address account) external view returns (bool) {
        if (!programs[programId].exists) return false;
        return _isJudge(programs[programId], account);
    }

    function getPhase(uint256 programId) external view returns (Phase) {
        Program storage p = programs[programId];
        if (!p.exists)     revert ProgramNotFound();
        if (p.cancelled)   return Phase.Cancelled;
        if (p.finalized)   return Phase.Finalized;
        if (block.timestamp < p.submissionDeadline) return Phase.Submission;
        return Phase.Judging;
    }

    function votesRemaining(uint256 programId, address judge) external view returns (uint256) {
        Program storage p = programs[programId];
        if (!p.exists) revert ProgramNotFound();
        uint256 cast  = votesCast[programId][judge];
        uint256 total = p.prizes.length;
        return cast >= total ? 0 : total - cast;
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    function _isJudge(Program storage p, address account) internal view returns (bool) {
        uint256 len = p.judges.length;
        for (uint256 i = 0; i < len; i++) {
            if (p.judges[i] == account) return true;
        }
        return false;
    }

    function _hasCode(address account) internal view returns (bool) {
        uint256 size;
        assembly { size := extcodesize(account) }
        return size > 0;
    }
}

